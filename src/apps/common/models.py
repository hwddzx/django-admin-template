#!/usr/bin/env python
# -*- coding: utf-8 -*-
import uuid
import os
from django.conf import settings
from django.db import models


def unique_image_name(instance, filename):
    try:
        ext = os.path.splitext(filename)[1].lstrip('.')
    except BaseException:
        ext = "jpg"
    name = "%s.%s" % (str(uuid.uuid4()).replace('-', ''), ext)
    return '%s/%s' % (settings.MEDIA_IMAGE_PREFIX, name)


class ActiveDataManager(models.Manager):
    def get_query_set(self):
        return super(ActiveDataManager, self).get_query_set().filter(is_active=True)

    def get_queryset(self):
        return super(ActiveDataManager, self).get_queryset().filter(is_active=True)


class TimeBaseModel(models.Model):
    created = models.DateTimeField(verbose_name='创建时间', auto_now_add=True)

    updated = models.DateTimeField(verbose_name='更新时间', auto_now=True)

    def updated_timestamp(self):
        return int(self.updated.strftime("%s")) if self.updated else 0

    def created_timestamp(self):
        return int(self.created.strftime("%s")) if self.created else 0

    def get_etag(self):
        return str(self.updated_timestamp())

    class Meta:
        abstract = True
