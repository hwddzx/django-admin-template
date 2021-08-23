#!/usr/bin/env python
# -*- coding: utf-8 -*-
from django.conf import settings

from django.urls import include, path, re_path
from apps.admin import views

urlpatterns = [
    re_path(r'^$', views.HomeView.as_view(), name='admin_home'),
    re_path(r'^dashboard$', views.dashboard, name='dashboard'),
    path('account/', include(('apps.account.urls', 'apps.account'), namespace='account')),
    re_path(r'^initdata/$', views.initdata),
]

if settings.DEBUG:
    urlpatterns += [
        re_path(r'^loaddata/(?P<filename>.*)', views.loaddata),
    ]

urlpatterns += [
    re_path(r'^agent_mode/(?P<user_id>\d+)/enter/$', views.enter_agent_mode, name='enter_agent_mode'),
    re_path(r'^agent_mode/exit/$', views.exit_agent_mode, name='exit_agent_mode'),
]
