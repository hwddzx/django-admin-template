#!/usr/bin/env python
# -*- coding: utf-8 -*-
import subprocess
from optparse import make_option

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

BACKUP_CMD = 'PGPASSWORD="%(password)s" pg_dump -d %(database)s -h %(host)s -U %(user)s -Fc -f %(filename)s'
LOAD_CMD = 'PGPASSWORD="%(password)s" pg_restore -d %(database)s -Fc -h %(host)s -v -U %(user)s %(filename)s'
DEL_OLD_CMD = 'find %s -mtime +%d -name "*.backup" -exec rm -f {} \;'


class Command(BaseCommand):
    """
    run it with "crone" like below
    crone -e
        5 2 * * * workon env && cd /data/www/project/src/ && python manage.py postgres_utility --settings=settings.test >> /data/log/pg_utility.log 2>&1
    python manage.py postgres_utility -t 1.0.0.0

    导入格式
    python manage.py postgres_utility -t 1.0.0.0 -a load -f sql_file
    """
    option_list = BaseCommand.option_list + (
        make_option('-d', '--backup_dir',
                    action='store',
                    dest='backup_dir',
                    default="~/mysql_backup",
                    help='db backup dir'),
        make_option('-t', '--git_tag',
                    action='store',
                    dest='tag',
                    default="daily",
                    help='related source code tag'),
        make_option('-k', '--keep_days',
                    action='store',
                    dest='keep_days',
                    default=30,
                    help='keep backup day'),
        make_option('-a', '--action',
                    action='store',
                    dest='action',
                    default="dump",
                    help='dump or load data'),
        make_option('-f', '--file',
                    action='store',
                    dest='file',
                    default="",
                    help='file path'),
    )

    def handle(self, *args, **options):
        print(str(options))
        if options['action'] == 'dump':
            return self.dump_data(options)
        else:
            return self.load_data(options)

    def load_data(self, options):
        cmd = LOAD_CMD % {
            'password': settings.DATABASES['default']['PASSWORD'],
            'database': settings.DATABASES['default']['NAME'],
            'user': settings.DATABASES['default']['USER'],
            'host': settings.DATABASES['default']['HOST'],
            'filename': options['file']
        }
        print("[cmd] %s" % cmd)
        ret_code = subprocess.call(cmd, shell=True)
        if ret_code != 0:
            print("[ERROR] failed to load with cmd \n %s" % cmd)
        return ret_code

    def dump_data(self, options):
        backup_dir = options['backup_dir']
        backup_filename = options['file'] or \
                          '%s/%s_%s_%s.backup' % (backup_dir,
                                                  settings.DATABASES['default']['NAME'],
                                                  timezone.now().strftime('%Y%m%d%H%M%S'),
                                                  options['tag'])
        cmd = BACKUP_CMD % {
            'password': settings.DATABASES['default']['PASSWORD'],
            'database': settings.DATABASES['default']['NAME'],
            'user': settings.DATABASES['default']['USER'],
            'host': settings.DATABASES['default']['HOST'],
            'filename': backup_filename
        }
        print("[cmd] %s" % cmd)
        ret_code = subprocess.call(cmd, shell=True)
        if ret_code != 0:
            print("[ERROR] failed to backup with cmd \n %s" % cmd)

        cmd = DEL_OLD_CMD % (backup_dir, options['keep_days'])
        print("[cmd] %s" % cmd)
        ret_code = subprocess.call(cmd, shell=True)
        if ret_code != 0:
            print("[ERROR] failed to clean old files with cmd \n %s" % cmd)
        return ret_code
