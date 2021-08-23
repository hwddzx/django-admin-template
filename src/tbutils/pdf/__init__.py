#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import logging
from requests import session
from rest_framework import status

logger = logging.getLogger('Pdfbot')


class PdfBot(object):
    """
    访问pdf service生成pdf
    """
    def __init__(self, username, password, base_url='https://pdf.testbird.com'):
        self._token = ''
        self._username = username
        self._password = password
        self._cookies = dict()
        self._base_url = base_url
        self._url2pdf_endpoint = '%s/api/pdf/url2pdf/' % self._base_url
        self._token_endpoint = '%s/api/token/' % self._base_url
        self._session = session()
        self._headers = {
            'Pragma': 'no-cache',
            'Accept-Encoding': 'gzip,deflate,sdch',
            'Accept-Language': 'en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4',
            'Content-Type': 'application/json; charset=UTF-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }

    def set_token(self, token):
        self._token = token

    def set_base_url(self, base_url):
        self._base_url = base_url
        self._url2pdf_endpoint = '%s/api/pdf/url2pdf/' % self._base_url
        self._token_endpoint = '%s/api/token/' % self._base_url

    def get_token(self):
        payload = {'username': self._username, 'password': self._password}
        try:
            ret = self._session.post(self._token_endpoint,
                                     data=json.dumps(payload),
                                     headers=self._headers)

            if ret.status_code == status.HTTP_200_OK:
                self._token = ret.json()['token']
                return {'status': 'success', 'msg': 'success'}
            else:
                ret_json = ret.json()
                if 'detail' in ret_json:
                    return {'status': 'error', 'msg': ret.json()['detail']}
                elif 'non_field_errors' in ret_json:
                    return {'status': 'error', 'msg': ret.json()['non_field_errors'][0]}
                else:
                    key = ret_json.keys()[0]
                    msg = u"[%s]error: %s" % (key, ret_json[key][0])
                    return {'status': 'error', 'msg': msg}
        except:
            import traceback
            logger.info('get candiate with error:%s' % traceback.format_exc())
            # FIXME too board error msg used here, should be fixed later
            return {'status': 'error', 'msg': 'unknown error'}

    def get_pdf(self, source_url, filename, save_html=False, use_qiniu_storage=False):
        headers = {'Authorization': 'Token %s' % self._token}
        payload = {"name": filename, "source_url": source_url, "save_html": save_html, "use_qiniu_storage": use_qiniu_storage}
        try:
            ret = self._session.post(self._url2pdf_endpoint,
                                     headers=headers,
                                     data=json.dumps(payload))
            if ret.status_code == status.HTTP_401_UNAUTHORIZED:
                if ret.json()['detail'].startswith('Invalid token'):
                    ret_token = self.get_token()
                    if ret_token['status'] == 'success':
                        return self.get_pdf(source_url, filename, save_html, use_qiniu_storage)
                    else:
                        return {'status': 'error', 'msg': ret_token['msg']}
            elif ret.status_code == status.HTTP_200_OK:
                return {'status': 'success', 'msg': 'success'}
            else:
                return {'status': 'error', 'msg': ret.json()['detail']}
        except:
            import traceback
            logger.info('get candiate with error:%s' % traceback.format_exc())
            # FIXME too board error msg used here, should be fixed later
            return {'status': 'error', 'msg': 'unknown error'}

if __name__ == '__main__':
    bot0 = PdfBot('crowdtest1', 'Welcome2', 'http://pdf.dev:8002')
    print bot0.get_pdf('http://www.testbird.com/guide', '1.pdf')

    bot1 = PdfBot('crowdtest', 'Welcome2', 'http://pdf.dev:8002')
    print bot1.get_pdf('http://www.testbird.com/guide', '1.pdf')

    bot2 = PdfBot('crowdtest', 'Welcome1', 'http://pdf.dev:8002')
    print bot2.get_pdf('http://www.testbird.com/guide', '1.pdf', True)


