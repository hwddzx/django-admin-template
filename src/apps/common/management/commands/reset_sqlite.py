#!/usr/bin/env python
# -*- coding: utf-8 -*-
import glob
import logging
from optparse import make_option
from django.apps import apps
from django.conf import settings
from django.core.management import BaseCommand, call_command
import os
from django.utils._os import upath
import shutil

logger = logging.getLogger('command.' + os.path.basename(os.path.dirname(__file__)))

class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('-t', '--test',
                    action='store_true',
                    dest='test',
                    default=False,
                    help='load the test data'),
        make_option('-n', '--no_del',
                    action='store_true',
                    dest='no_del',
                    default=False,
                    help="don't delete db"),
    )
    """
    A simple command to delete the local sqlite db and recreate it with "syncdb"
    run it as below:
        ./manage.py reset_sqlite --settings=settings.local
    """
    def handle(self, *args, **options):
        if settings.SETTINGS_MODULE != "settings.local":
            raise BaseException('必须在local下运行!')
        if not options['no_del']:
            db_path = settings.DATABASES['default']['NAME']
            if os.path.exists(db_path):
                logger.debug("delete sqlite db " + db_path)
                os.unlink(db_path)

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

        if options['test']:
            self.load_test_data()

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
