from django.apps import AppConfig as AppConf


class AppConfig(AppConf):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.account'
