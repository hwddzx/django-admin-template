#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import logging

from django.db import models
from django.contrib.auth.models import AbstractUser

logger = logging.getLogger('apps.' + os.path.basename(os.path.dirname(__file__)))


class User(AbstractUser):
    phone = models.CharField(max_length=32,
                             default='',
                             verbose_name='电话',
                             db_index=True,
                             blank=True,
                             null=True)

    GENDER_MALE = 'M'
    GENDER_FEMALE = 'F'
    GENDER_CHOICES = (
        (GENDER_MALE, '男'),
        (GENDER_FEMALE, '女'),
    )

    gender = models.CharField(max_length=12, choices=GENDER_CHOICES,
                              default=GENDER_MALE,
                              blank=True,
                              verbose_name='性别')

    class Meta:
        verbose_name = '用户'
        verbose_name_plural = verbose_name
        ordering = ('-id',)

    def __str__(self):
        return (self.last_name + self.first_name) or self.username
