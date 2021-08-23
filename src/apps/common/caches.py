#!/usr/bin/env python
# -*- coding: utf-8 -*-
import logging
import os
from django.core.cache import cache
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


logger = logging.getLogger('apps.' + os.path.basename(os.path.dirname(__file__)))

INVALID_ETAG = "0"
CACHE_TIMEOUT_SEC = 1 * 60 * 60


@receiver(post_save)
def handle_db_updated(sender, instance=None, created=False, **kwargs):
    """
    observe the change of db and clean up the cache
    """
    if hasattr(sender, 'cache_objects'):
        sender.cache_objects.clean_cache(instance)


class SimpleCacheManager(models.Manager):
    """
    a simple cache manager to cache data associated with a model
    It will be flush on all if any of them is changed.
    """
    cache_timeout_sec = CACHE_TIMEOUT_SEC

    def _get_cache_key(self, key):
        return "m:%s:%s" % (self.model._meta.object_name.lower(), key)

    def clean_cache(self, model_instance=None):
        key = self._get_cache_key('version')
        try:
            new_version = cache.incr(key)
            self.post_clean_cache(new_version)
        except ValueError as e:
            cache.set(key, 1, None)
            logger.debug("clean cache and set %s" % key)

    def _get_cache_version(self):
        key = self._get_cache_key('version')
        version = cache.get(key)
        if version is None:
            logger.debug("init cache version %s with 1" % key)
            cache.set(key, 1, None)
            return 1
        return version

    def post_clean_cache(self, version):
        pass

    def get_etag(self, **filters):
        key = self._get_cache_key("etag")
        version = self._get_cache_version()
        etag = cache.get(self._get_cache_key_etag(), version=version)
        if not etag:
            try:
                # XXX: intend not to use active_objects. we should consider the deactive object as etag value.
                latest_obj = self.filter(**filters).only('updated').latest()
                etag = latest_obj.get_etag()
            except self.model.DoesNotExist:
                etag = INVALID_ETAG
            cache.set(key, etag, self.cache_timeout_sec, version=version)
        return etag

    def get_objects(self, cache_key='objects', cache_missing_callback=None):
        key = self._get_cache_key(cache_key)
        version = self._get_cache_version()
        data = cache.get(key, version=version)
        if not data:
            if cache_missing_callback:
                data = cache_missing_callback()
            else:
                data = self.model.objects.values()
            cache.set(key, data, self.cache_timeout_sec, version=version)
        return data

    def get_objects_as_dict(self):
        return {item['id']: item for item in self.get_objects()}

    def get_opaque_object(self, key, cache_missing_callback):
        version = self._get_cache_version()
        obj_key = self._get_cache_key(key)
        data = cache.get(obj_key, version=version)
        if not data:
            data = cache_missing_callback()
            cache.set(obj_key, data, self.cache_timeout_sec, version=version)
        return data
