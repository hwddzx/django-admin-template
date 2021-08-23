# !/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import logging
from itertools import izip_longest

import requests


logger = logging.getLogger('service.email_sender')

API_USER = 'Desktop'
API_KEY = 'G9GsYCGm9qNg1LgL'
API_URL = "http://sendcloud.sohu.com/webapi/mail.send.json"
API_V2_URL = "http://api.sendcloud.net/apiv2/mail/send"


def grouper(n, iterable, fillvalue=''):
    args = [iter(iterable)] * n
    return izip_longest(fillvalue=fillvalue, *args)


# reference: http://sendcloud.sohu.com/doc/email/send_email/#_1

def send_email(subject, content, email_to):
    def do_post(params):
        response = requests.post(API_URL, files={}, data=params)
        response_json = json.loads(response.text)
        if response_json['message'] == 'error':
            params.pop('html')
            logger.error('send email failed, response: %s' % response.text)
            return False, response_json['errors']
        else:
            return True, None

    params = {"api_user": API_USER,
              "api_key": API_KEY,
              "from": "service@mail.testbird.com",
              "fromname": "TestBird",
              "subject": subject.encode('utf-8'),
              "html": content.encode('utf-8'),
              "resp_email_id": "true"
    }

    # API 参数 to 的收件人是全部显示在邮件中, X-SMTPAPI 中的 to 是独立显示在邮件中
    if isinstance(email_to, list):
        result = True
        error = []
        # X-SMTPAPI 中的 to 的收件人个数不能超过100
        for to_send in list(grouper(100, email_to)):
            params['x_smtpapi'] = json.dumps({
                # 含有收件人地址的数组, 指定邮件的收件人.
                'to': [email for email in to_send if email]
            })
            ret, err = do_post(params)
            if not ret:
                result = result and ret
                error.append(err)

        return result, error
    else:
        params['to'] = email_to
        return do_post(params)


if __name__ == "__main__":
    send_email('title', 'content', 'huangwei1@testbird.com')
