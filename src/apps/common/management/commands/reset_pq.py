#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import glob
import shutil
import logging
import subprocess
from optparse import make_option

from django.apps import apps
from django.conf import settings
from django.core.management import BaseCommand, call_command
from django.utils._os import upath

DUMPDB_CMD = 'pg_dump -s -f %s %s'
DROPDB_CMD = 'dropdb %s'
CREATEDB_CMD = 'createdb %s'


logger = logging.getLogger('command.' + os.path.basename(os.path.dirname(__file__)))


class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('-r', '--reload',
                    action='store_true',
                    dest='reload',
                    default=False,
                    help='reload the test data'),
        make_option('-d', '--dump',
                    action='store_true',
                    dest='backup',
                    default=False,
                    help="make a dump before dropping db"),
        make_option('-f', '--file',
                    action='store',
                    dest='file',
                    default="pq_db.dump",
                    help='file path'),
    )
    """
    A simple command to delete the local sqlite db and recreate it with "syncdb"
    run it as below:
        ./manage.py reset_pq --settings=settings.local
    """
    def handle(self, *args, **options):
        if settings.SETTINGS_MODULE != "settings.local":
            raise BaseException('必须在local下运行!')

        db_name = settings.DATABASES['default']['NAME']
        if options['backup']:
            self.run_shell_cmd(DUMPDB_CMD % (
                '%s/%s' % (settings.APP_ROOT, options['file']),
                db_name
            ))
        self.run_shell_cmd(DROPDB_CMD % db_name)
        self.run_shell_cmd(CREATEDB_CMD % db_name)

        # delete old test stuffs
        old_files = glob.glob(os.path.join(settings.MEDIA_ROOT, settings.MEDIA_IMAGE_PREFIX)+"/*.*")
        old_files.extend(glob.glob(os.path.join(settings.MEDIA_ROOT, settings.MEDIA_CONTENT_PREFIX)+"/*.*"))
        for f in old_files:
            os.unlink(f)

        # copy test image to media root
        fixture_dirs = self.fixture_dirs()
        for dir in fixture_dirs:
            files = []
            # copy image files
            files.extend(glob.glob(os.path.join(dir, "*.png")))
            files.extend(glob.glob(os.path.join(dir, "*.jpg")))
            for file in files:
                shutil.copy(file, os.path.join(settings.MEDIA_ROOT, settings.MEDIA_IMAGE_PREFIX))
            # copy apk files
            files = glob.glob(os.path.join(dir, "*.apk"))
            for file in files:
                shutil.copy(file, os.path.join(settings.MEDIA_ROOT, settings.MEDIA_CONTENT_PREFIX))

        call_command("migrate", migrate=True, interactive=False, settings=settings.SETTINGS_MODULE, traceback=True, verbosity=0)

        # load init data
        fixtures = []
        for apps in settings.PROJECT_APPS:
            short_name = apps.split(".")[-1]
            fixtures += ["initial_%s_data.json" % short_name]
        print(fixtures)
        call_command("loaddata", *fixtures, settings=settings.SETTINGS_MODULE, traceback=True, verbosity=0)

        if options['reload']:
            self.load_test_data()

    @staticmethod
    def run_shell_cmd(cmd):
        logging.debug("[cmd] start running command %s" % cmd)
        ret_code = subprocess.call(cmd, shell=True)
        logging.debug("[cmd] return code = %s" % ret_code)
        if ret_code != 0:
            print("[ERROR] failed to execute cmd \n %s" % cmd)
        return ret_code

    def load_test_data(self):
        fixtures = []
        for apps in settings.PROJECT_APPS:
            short_name = apps.split(".")[-1]
            fixtures += ["test_%s_data.json" % short_name]
        print(fixtures)
        call_command("loaddata", *fixtures, settings=settings.SETTINGS_MODULE, traceback=True, verbosity=0)

    def fixture_dirs(self):
        """
        Return a list of fixture directories.

        The list contains the 'fixtures' subdirectory of each installed
        application, if it exists, the directories in FIXTURE_DIRS, and the
        current directory.
        """
        dirs = []
        for app_config in apps.get_app_configs():
            app_dir = os.path.join(app_config.path, 'fixtures')
            if os.path.isdir(app_dir):
                dirs.append(app_dir)
        dirs.extend(list(settings.FIXTURE_DIRS))
        dirs.append('')
        dirs = [upath(os.path.abspath(os.path.realpath(d))) for d in dirs]
        print(str(dirs))
        return dirs
