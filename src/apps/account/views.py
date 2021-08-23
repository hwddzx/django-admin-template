#!/usr/bin/env python
# -*- coding: utf-8 -*-

import logging
import os

from django.conf import settings
from django.contrib import auth
from django.contrib.auth.models import Group
from django.core.exceptions import PermissionDenied
from django.urls import reverse
from django.shortcuts import redirect, render
from django.template import RequestContext
from django.views.generic import RedirectView
from django.views.generic.base import TemplateResponseMixin, View

from tbutils.db.queryutil import get_object_or_none
from apps.account.models import User
from apps.account.forms import GroupDatatablesBuilder, GroupForm, UserDatatablesBuilder, UserForm, \
    UserChangePasswordForm
from apps.common import exceptions
from apps.common.admin.views import NavigationHomeMixin, ModelAwareMixin, DatatablesBuilderMixin, AjaxDatatablesView, RequestAwareMixin, \
    AjaxUpdateView, AjaxSimpleUpdateView, AdminRequiredMixin, AjaxFormView, HttpResponseJson

logger = logging.getLogger('apps.'+os.path.basename(os.path.dirname(__file__)))


def login_view(request):
    if request.method == 'POST':
        result = exceptions.build_success_response_result()
        username = request.POST.get('username', '')
        password = request.POST.get('password', '')
        user = auth.authenticate(username=username, password=password)
        if user and user.is_active and user.is_staff:
            auth.login(request, user)
            return redirect('/admin')
        else:
            result = exceptions.build_response_result(exceptions.ERROR_CODE_AUTH_FAILED_INVALID_USERNAME_OR_PASSWORD)
    return render(request, 'account/login.html', locals())


class LogoutView(RedirectView):
    # XXX: MUST disable permanent direct, otherwise browser will not send the logout again.
    permanent = False

    def get_redirect_url(self, **kwargs):
        # 退出代理模式.
        if 'agent_user' in self.request.session:
            del self.request.session['agent_user']
            return reverse('admin:admin_home')

        auth.logout(self.request)
        return reverse('admin:account:login', args=kwargs)


class GroupListView(NavigationHomeMixin, ModelAwareMixin, DatatablesBuilderMixin, AdminRequiredMixin, AjaxDatatablesView):
    model = Group
    app_label = 'account'
    queryset = Group.objects.prefetch_related().order_by('name')
    datatables_builder_class = GroupDatatablesBuilder


class GroupFormView(RequestAwareMixin, ModelAwareMixin, AdminRequiredMixin, AjaxFormView):
    model = Group
    form_class = GroupForm
    app_label = 'account'


class GroupDeleteView(AdminRequiredMixin, AjaxSimpleUpdateView):
    model = Group
    app_label = 'account'

    def update(self, group):
        group.delete()


class UserListView(NavigationHomeMixin, ModelAwareMixin, DatatablesBuilderMixin, AjaxDatatablesView):
    model = auth.get_user_model()
    datatables_builder_class = UserDatatablesBuilder
    queryset = auth.get_user_model().objects.all()


class UserFormView(RequestAwareMixin, ModelAwareMixin, AjaxFormView):
    model = auth.get_user_model()
    model_name = 'user'
    template_name = 'account/user.form.inc.html'
    form_class = UserForm

    def get_context_data(self, **kwargs):
        context = super(UserFormView, self).get_context_data(**kwargs)
        if self.object:
            # only apply dummy password for the edit case.
            context['dummy_password'] = UserForm.DUMMY_PASSWORD
        return context


class UserLockView(AdminRequiredMixin, AjaxSimpleUpdateView):
    model = auth.get_user_model()

    def update(self, user):
        if self.request.user.id == user.id:
            return u"不允许自己锁定自己!"
        if user.is_superuser:
            return u"不允许锁定超级用户!"
        user.is_active = False
        user.save()


class UserUnlockView(AdminRequiredMixin, AjaxSimpleUpdateView):
    model = auth.get_user_model()

    def update(self, user):
        if settings.CUSTOMER == settings.HUA_BAO:
            return u"用户已锁定,不允许恢复!"
        user.is_active = True
        user.save()


class UserChangePasswordView(ModelAwareMixin, RequestAwareMixin, AjaxUpdateView):
    model = auth.get_user_model()
    form_class = UserChangePasswordForm
    model_name = 'user'
    template_name = 'account/user.changepassword.inc.html'
    form_action_url_name = 'admin:account:change_password'

    def get_context_data(self, **kwargs):
        data = super(UserChangePasswordView, self).get_context_data(**kwargs)
        data['page_title'] = '修改密码'
        return data


class ForgetPasswordView(TemplateResponseMixin, View):
    template_name = 'account/password_reset.html'

    def get(self, request, *args, **kwargs):
        return self.render_to_response(locals())


class ResetPasswordView(View):

    http_method_names = ['post']

    def post(self, request, *args, **kwargs):
        email = request.POST['email']
        target_user = get_object_or_none(User, email=email)
        if target_user:
            return HttpResponseJson(exceptions.build_success_response_result(), request)
        else:
            return HttpResponseJson(exceptions.build_response_result(exceptions.ERROR_CODE_RECORD_NOT_EXIST), request)

