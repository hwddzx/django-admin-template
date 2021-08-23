from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', include(('apps.admin.urls', 'apps.admin'), namespace='admin')),
]
