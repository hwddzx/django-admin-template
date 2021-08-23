#!/usr/bin/env python
# -*- coding: utf-8 -*-
import glob
import os

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils._os import upath
from django.apps import apps


class Command(BaseCommand):
    """
    clean all of migrations files for recreate them later.
    """

    def handle(self, *args, **options):
        migrations_dirs = self.migrations_dirs()
        internal_files = []
        for dir in migrations_dirs:
            py_files = glob.glob(os.path.join(dir, "*.py"))
            for py in py_files:
                # makemigrations will failed if our internal migration files are not remove first.
                # so rename it and restore it afer do it.
                # if py.find('_data') != -1:
                #     temp_file = py + "_"
                #     os.rename(py, temp_file)
                #     internal_files.append(temp_file)
                # don't remove self-defined migration file.
                if not py.endswith('__init__.py'):
                    print("remove " + py)
                    os.unlink(py)

        call_command("makemigrations", verbosity=1)

        for py in internal_files:
            os.rename(py, py.strip('_'))

    def migrations_dirs(self):
        """
        Return a list of fixture directories.

        The list contains the 'fixtures' subdirectory of each installed
        application, if it exists, the directories in FIXTURE_DIRS, and the
        current directory.
        """
        dirs = []
        for app_config in apps.get_app_configs():
            app_dir = os.path.join(app_config.path, 'migrations')
            if os.path.isdir(app_dir):
                dirs.append(app_dir)
        dirs.extend(list(settings.FIXTURE_DIRS))
        dirs = [upath(os.path.abspath(os.path.realpath(d))) for d in dirs]
        return dirs
