#!/usr/bin/env python
# -*- coding: utf-8 -*-
import base64
import json
import logging
import re
import subprocess
from os import environ
import os

from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied
from django.core.management import call_command
from django.http import HttpResponse
from django.conf import settings
from django.urls import reverse
from django.template import RequestContext
from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required
from django.utils import translation
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import View
from rest_framework.authtoken.models import Token
# from apps.account.models import User

HERE = os.path.dirname(__file__)
logger = logging.getLogger('apps.' + os.path.basename(os.path.dirname(HERE)) + '.' + os.path.basename(HERE))


def build_menu(request):
    SUBMENU_ACCOUNT = [
        # ('公司图标', reverse('admin:foundation:companyconfig_list'), lambda request: request.user.is_admin()),
        ('用户', reverse('admin:account:user_list'), lambda request: request.user.is_superuser),
        ('用户组', reverse('admin:account:group_list'), lambda request: request.user.is_superuser),
        # ('系统配置', reverse('admin:foundation:sysconfig_list'), lambda request: request.user.is_admin()),
        # ('邮件组', reverse('admin:customer:mailgroup_list'), lambda request: request.user.is_admin()),
    ]

    SUBMENU_APP = [
        # ('应用列表', reverse('admin:app:app_list'), None),
        # ('正则表达式模板列表', reverse('admin:app:regexptemplate_list'), None),
        # ('测试用例列表', reverse('admin:testcase:testcase_list'), None),
        # ('测试用例集列表', reverse('admin:testcase:testsuite_list'), None),
        # ('测试模块列表', reverse('admin:testcase:component_list'), None),
        # ('测试任务列表', reverse('admin:task:task_list'), None),
        # ('测试任务执行列表', reverse('admin:task:execution_list'), None),
        # ('报告列表', reverse('admin:task:report_list'), None),
    ]

    SUBMENU_DEVICE = [
        # ('租用记录', reverse('admin:rio:rentrecord_list'), None),
        # ('一键停租', reverse('admin:rio:batch_stoprent_admin_action'),
        #  lambda request: request.user.is_admin() if settings.IS_LAB else None),
        # ('设备厂家', reverse('admin:foundation:manufacturer_list'), lambda request: request.user.is_admin()),
        # ('工控机', reverse('admin:device:devicecontroller_list'), None),
        # ('设备', reverse('admin:device:device_list'), None),
        # ('标签', reverse('admin:device:tag_list'), lambda request: request.user.is_admin()),
        # ('设备组', reverse('admin:device:group_list'), lambda request: request.user.is_admin()),
        # ('告警列表', reverse('admin:device:alarm:alarm_list'), None),
    ]

    MENU = (
        {'men': '控制面板', 'url': reverse('admin:dashboard'), 'icon': 'fa fa-dashboard blue', 'submen': [],
         'permission': lambda request: request.user.is_staff},
        {'men': '系统管理', 'url': '', 'icon': 'fa fa-cogs', 'submen': SUBMENU_ACCOUNT},
        {'men': '应用管理', 'url': '', 'icon': 'fa fa-archive', 'submen': SUBMENU_APP},
        {'men': '设备管理', 'url': '', 'icon': 'fa fa-group', 'submen': SUBMENU_DEVICE},
    )

    menus = []
    for item in MENU:
        # check the top menu first.  not go into submenu if top menu is not permitted.
        if 'permission' in item:
            if not item['permission'](request):
                continue
        if item['men'] == '文件扫描管理' and settings.CUSTOMER != 'XINGYE':
            continue

        has_permission = False
        menu = {"name": item['men'], "url": item['url'], "icon": item['icon'], "submenus": []}
        submenu = [m for m in item['submen'] if m]
        for (name, url, permission_check) in submenu:
            if permission_check is None or (permission_check and permission_check(request)):
                has_permission = True
                menu['submenus'].append({"name": name, "url": url})
        if has_permission or menu['url']:
            menus.append(menu)
    # remove menu with empty submenu
    return [menu for menu in menus if menu['url'] or menu['submenus']]


class HomeView(View):
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(HomeView, self).dispatch(*args, **kwargs)

    """
    重定向到login页面
    """

    def get(self, request, *args, **kwargs):
        site_name = settings.SITE_NAME
        if request.user.is_authenticated:
            if not request.user.is_staff:
                return redirect(settings.FRONTEND_ROOT)

            menus = build_menu(request)
            return render(request, 'admin/home.html', locals())

        # 如果没有登陆，返回默认的主页
        return redirect(reverse('admin:account:login'))


@login_required()
def dashboard(request):
    try:
        env_settings = environ['DJANGO_SETTINGS_MODULE']
    except KeyError:
        env_settings = "not define in env"

    # get which tag is using in current branch
    # cmd = 'cd %s && git describe --abbrev=0 --tags' % settings.SITE_ROOT
    # cmd = 'cd %s && git rev-list --date-order -n 1 --format=%%d HEAD' % settings.SITE_ROOT
    # git_tag = subprocess.check_output(cmd, stderr=subprocess.STDOUT, shell=True)
    git_tags = open(os.path.join(settings.SITE_ROOT, 'version'), 'r').readlines()
    git_tag = ''
    for tag in git_tags:
        git_tag += tag
    git_tag = str.strip(git_tag)
    if not git_tag:
        git_tag = 'unknown'
    template = 'admin/dashboard.inc.html'
    active_settings = settings.SETTINGS_MODULE

    return render(request, template, locals())


@login_required()
def loaddata(request, filename):
    if not request.user.is_superuser:
        raise PermissionDenied
    call_command("loaddata", filename, settings=settings.SETTINGS_MODULE, traceback=True, verbosity=0)
    return HttpResponse(content='load data %s success' % filename)


@login_required()
def initdata(request):
    if not request.user.is_superuser:
        raise PermissionDenied
    call_command("loaddata", "initial_account_data.json", settings=settings.SETTINGS_MODULE, traceback=True,
                 verbosity=0)
    return HttpResponse(content='load data initial_account_data.json success')


@login_required()
def enter_agent_mode(request, user_id):
    if not request.user.has_perm('customer.can_agent_customer'):
        raise PermissionDenied
    # current user can't agent this customer
    user = User.objects.filter(id=user_id).first()
    if not user:
        raise PermissionDenied
    # request.session['agent_user'] = user_id

    if not user.is_staff:
        request.session['agent_user'] = user.id
        return redirect(_build_front_url(user))

    return redirect(reverse('admin:admin_home'))


def _build_front_url(user):
    customer = user.customer
    translation.activate(customer.get_language())
    token, created = Token.objects.get_or_create(user=user)
    frontend_config_base64 = customer.get_frontend_config(token.key)
    return settings.FRONTEND_ROOT + '?%s' % frontend_config_base64


@login_required()
def exit_agent_mode(request):
    if 'agent_user' in request.session:
        del request.session['agent_user']
    return redirect(reverse('admin:admin_home'))
