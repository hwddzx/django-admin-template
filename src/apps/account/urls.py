#!/usr/bin/env python
# -*- coding: utf-8 -*-
from django.conf.urls import url
from apps.account import views

urlpatterns = [
    url(r'^login/$', views.login_view, name='login'),
    url(r'^logout/$', views.LogoutView.as_view(), name='logout'),
    url(r'^forget_password/$', views.ForgetPasswordView.as_view(), name='forget_password'),
    url(r'^reset_password/$', views.ResetPasswordView.as_view(), name='reset_password'),

    url(r'^user/list/$', views.UserListView.as_view(), name='user_list'),
    url(r'^user/list/.json/$', views.UserListView.as_view(), name='user_list.json', kwargs={'json': True}),

    url(r'^user/create/$', views.UserFormView.as_view(), name='user_create', kwargs={'pk': 0}),
    url(r'^user/(?P<pk>\d+)/edit/$', views.UserFormView.as_view(), name='user_edit'),

    url(r'^user/(?P<pk>\d+)/unlock/$', views.UserLockView.as_view(), name='user_lock'),
    url(r'^user/(?P<pk>\d+)/lock/$', views.UserUnlockView.as_view(), name='user_unlock'),
    url(r'^user/(?P<pk>\d+)/change_password/$', views.UserChangePasswordView.as_view(), name='change_password'),

    url(r'^group/list/$', views.GroupListView.as_view(), name='group_list'),
    url(r'^group/list/.json/$', views.GroupListView.as_view(), name='group_list.json', kwargs={'json': True}),

    url(r'^group/create/$', views.GroupFormView.as_view(), name='group_create', kwargs={'pk': 0}),
    url(r'^group/(?P<pk>\d+)/edit/$', views.GroupFormView.as_view(), name='group_edit'),
    url(r'^group/(?P<pk>\d+)/delete/$', views.GroupDeleteView.as_view(), name='group_delete'),
]
