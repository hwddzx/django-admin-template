#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import logging

import os
import requests


_logger = logging.getLogger('service.requestwrapper')


class RequestWrapperMixin(object):
    """
    A mixin to wrapper the http action with Request
    It assume that the response data is encoded with json.
    """

    MAX_LOGGING_SIZE = 2048

    def do_post(self, url, data, complete_callback=None, request_error_callback=None, log_callback=None, customized_logger=None, **kwargs):
        logger = customized_logger or _logger
        logger.debug('')
        logger.debug('====================')
        data = data or {}
        request_data = json.dumps(data, ensure_ascii=False)
        if len(request_data) > self.MAX_LOGGING_SIZE:
            request_data = request_data[0:self.MAX_LOGGING_SIZE]
        logger.debug(">>> request post [%s]->\n%s", url, request_data)

        try:
            r = requests.post(url, json=data, **kwargs)
            response_data = "<<< response %s %s" %(r.status_code, r.text)
            logger.debug(response_data)
            if r.status_code != requests.codes.ok:
                if request_error_callback:
                    return request_error_callback(r)
                return r.reason, None

            json_data = r.json()
            if complete_callback:
                return complete_callback(r, json_data)
            return None, json_data
        except Exception as e:
            return '网络错误 %s ' % e.message, None
        finally:
            if log_callback:
                log = ">> request: POST [%s]\n    %s\n << response: [%s]\n    %s" % (url, request_data, r.status_code, r.text)
                log_callback(log)


    def do_get(self, url, data, complete_callback=None, request_error_callback=None, log_callback=None, customized_logger=None, **kwargs):
        logger = customized_logger or _logger
        logger.debug('')
        logger.debug('====================')
        data = data or {}
        request_data = json.dumps(data, ensure_ascii=False)
        if len(request_data) > self.MAX_LOGGING_SIZE:
            request_data = request_data[0:self.MAX_LOGGING_SIZE]
        logger.debug(">>> request get [%s]->\n%s", url, request_data)

        try:
            r = requests.get(url, params=data, **kwargs)
            # 防止收到消息内容过长，打印信息过多
            logger.debug("<<< response %s %s" %(r.status_code, r.text[0:min(len(r.text), self.MAX_LOGGING_SIZE)]))
            if r.status_code != requests.codes.ok:
                if request_error_callback:
                    return request_error_callback(r)
                return r.reason, None

            json_data = r.json()
            if complete_callback:
                return complete_callback(r, json_data)
            return None, json_data
        except Exception as e:
            return '网络错误 %s ' % e.message, None
        finally:
            if log_callback:
                log = ">> request: GET [%s]\n    %s\n << response: [%s]\n    %s" % (url, request_data, r.status_code, r.text)
                log_callback(log)
