#!/usr/bin/env python
# -*- coding: utf-8 -*-

# http://xlambda.com/gevent-tutorial/
import gevent
from gevent import monkey

import json
import logging
import threading
from collections import defaultdict
from urlparse import urlparse
from django import forms
from django.conf import settings
from django.core.cache import cache
import os
import requests
from tbutils.randoms import gen_uuid_filename
import qiniu
from qiniu import BucketManager, build_batch_stat

HERE = os.path.dirname(__file__)
logger = logging.getLogger('apps.' + os.path.basename(os.path.dirname(HERE)) + '.' + os.path.basename(HERE))


class QiniuClient(object):
    # http://developer.qiniu.com/docs/v6/sdk/python-sdk.html#rs
    def __init__(self, bucket_name=None, bucket_domain=None):
        self.bucket_name = bucket_name or settings.QINIU['media'][0]
        self.bucket_domain = bucket_domain or settings.QINIU['media'][1]

    access_key = "cc_e1uiaLSDudKLTSHmg8M9VNK9rroIfkW-WinLb"
    secret_key = "Z68p4J3fjIdhuay8zDt42iY7R8hBbMZeGuekkTwT"
    auth = qiniu.Auth(access_key, secret_key)
    bucket = BucketManager(auth)

    def get_file_info(self, key):
        ret, info = self.bucket.stat(self.bucket_name, key)
        return info

    def qiniu_fop(self, ops, key):
        # 这个key只要是空间中存在的就行，在mkzip操作中没有实际含义
        pipeline = 'tbextractorqueue'
        pfop = qiniu.PersistentFop(self.auth, self.bucket_name, pipeline)
        ret, info = pfop.execute(key, ops, 1)
        return info

    def get_tb_qiniu_uptoken(self):
        key = 'qiniu_uptoken'
        cache_time = 10 * 60 # 10m
        token = cache.get(key)
        if token is None:
            token = self.auth.upload_token(self.bucket_name, expires=(6 * 3600))
            cache.set(key, token, cache_time)
        return token

    def get_tb_qiniu_uptoken_no_cache(self, key=None):
        # 如果key不为空，那么允许上传云端已存在的key文件，新文件将覆盖原文件
        return self.auth.upload_token(self.bucket_name, key=key, expires=(6 * 3600), policy={"scope": "%s:%s" % (self.bucket_name, key) if key else None})

    def delete_files(self, urls, batch_size=100):
        def _get_bucket_and_key(url):
            url = urlparse(url)
            if url.scheme:
                domain = "%s://%s/" % (url.scheme, url.netloc)
                bucket = settings.QINIU_DOMAIN_DICT.get(domain)
            else:
                bucket = self.bucket_name

            return bucket, os.path.basename(url.path)

        bucket_dict = defaultdict(list)
        for url in urls:
            bucket, key = _get_bucket_and_key(url)
            bucket_dict[bucket].append(key)

        res = []
        all_keys = []
        for bucket, keys in bucket_dict.items():
            batch_count = (len(keys) - 1) / batch_size + 1
            all_keys.extend(keys)
            for i in range(0, batch_count):
                from_index = i * batch_size
                to_index = min(from_index + batch_size, len(keys))
                operations = qiniu.build_batch_delete(bucket, keys[from_index: to_index])
                ret, info = self.bucket.batch(operations)
                qiniu_results = json.loads(info.text_body)
                res.extend(qiniu_results)
        return zip(all_keys, res)

    def upload_to_qiniu(self, file, key=None, allow_cover=False, ext='.png'):
        """
        file: file content
        key: the new filename for this file after upload, if set None, will auto set a random filename
        allow_cover:  allow cover file if the key already exists, if set True, the 'key' can't be None or else will not active.
                      if set False but the key already exists in current bucket, will get error response 614
        ext: the extension of file, only active while key=None
        :return: new qiniu url
        """
        uptoken = self.get_tb_qiniu_uptoken_no_cache(key) if key and allow_cover else self.get_tb_qiniu_uptoken()
        # remove the prefixed '.'
        key = key if key else gen_uuid_filename(ext[1:])
        try:
            r = requests.post("http://upload.qiniu.com/",
                              files={"file": file},
                              data={"token": uptoken, "key": key})
            json_data = r.json()
            if "error" in json_data:
                raise forms.ValidationError('七牛云错误 %s ' % json_data['error'])
            else:
                return self.bucket_domain + key
        except Exception as e:
            raise forms.ValidationError('网络错误 %s ' % e.message)

    def trandsfer_file_to_qiniu(self, file_url):
        """
        将网络上的文件转移到七牛云，并保持文件名不变，例如把http://file.lab.tb/sssss.jpg对应的文件转移到七牛云某个bucket下
        """
        if not file_url:
            return ''
        r = requests.get(file_url)
        file_key = os.path.basename(file_url)
        qiniu_file_url = self.upload_to_qiniu(r.content, key=file_key)

        return qiniu_file_url

    def trandsfer_file_to_qiniu_multithread(self, file_url_list):
        """
        多线程上传文件，适用于待上传文件较多时。该方法为每个文件上传创建一个线程，如果文件特别多，尽量分批调用。
        """
        if not file_url_list or not isinstance(file_url_list, list):
            return ''
        thread_list = list()
        for file_url in file_url_list:
            thread_list.append(threading.Thread(target=self.trandsfer_file_to_qiniu, args=(file_url,)))

        # 启动所有线程
        for thread in thread_list:
            thread.start()

        # 主线程中等待所有子线程退出
        for thread in thread_list:
            thread.join()

    def trandsfer_file_to_qiniu_with_coroutine(self, file_url_list):
        """
        使用协程上传文件, 提升速度
        """
        # 需要时才patch_socket
        monkey.patch_socket()
        monkey.patch_ssl()
        if not file_url_list or not isinstance(file_url_list, list):
            return ''

        thread_list = list()
        for file_url in file_url_list:
            thread_list.append(gevent.spawn(self.trandsfer_file_to_qiniu, file_url))
        gevent.joinall(thread_list)
        # 使用完恢复成默认socket
        import socket, ssl
        reload(socket)
        reload(ssl)

    def upload_local_files_to_qiniu(self, local_file, new_key=None):
        # 上传本地文件到七牛，且允许覆盖同名文件
        with open(local_file, 'r') as f:
            qiniu_url = self.upload_to_qiniu(f.read(), key=new_key, allow_cover=True)
        return qiniu_url

    def _build_qiniu_uptoken(bucket_name, access_key, secret_key):
        q = qiniu.Auth(access_key, secret_key)
        uptoken = q.upload_token(bucket_name)
        return uptoken

    # http://developer.qiniu.com/docs/v6/sdk/python-sdk.html#batch-stat
    def batch_query(self, files):
        ops = build_batch_stat(self.bucket_name, files)
        ret, info = self.bucket.batch(ops)
        return json.loads(info.text_body)

    # def upload_file_to_qiniu(uptoken, key, localfile):
    #     ret, err = uploader.put_file(uptoken, key, localfile)
    #     if (err.status_code != 200) and (err.exception is not None):
    #         logger.error('uploading to qiniu failed, error: %s ' % err)
    #         return False
    #     return True
