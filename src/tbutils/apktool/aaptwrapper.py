#!/usr/bin/env python
# -*- coding: utf-8 -*-

""" Wrapper of the aapt tool"""
import logging
import re
import subprocess

from struct import *
from zlib import *
import sys
reload(sys)
sys.setdefaultencoding('utf8')
import os

import zipfile
import biplist

root_dir = os.path.abspath(os.path.dirname(__file__))
platform_tools_dir = os.path.join(root_dir, 'platform-tools')

logger = logging.getLogger('commands.appt')


def locate_aapt():
    platform_mapping = {'linux2': 'linux', 'darwin': 'darwin', 'win32': 'windows', 'cygwin': 'windows'}
    try:
        platform = platform_mapping[sys.platform]
    except KeyError as e:
        print 'Error: platform %s is not supported' % sys.platform
        raise e

    aapt_ext = {'linux': '', 'windows': '.exe', 'darwin': ''}
    aapt = os.path.join(platform_tools_dir, platform, ''.join(['aapt', aapt_ext[platform]]))

    if not os.path.exists(aapt):
        raise NotImplementedError('Error: %s is not available!' % aapt)

    return aapt


def dump_badging(apk_path):
    aapt_path = locate_aapt()
    aapt_cmd = '%s dump badging %s' % (aapt_path, os.path.abspath(apk_path))
    cmd_output = None
    try:
        cmd_output = subprocess.check_output(aapt_cmd, shell=True, stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as e:
        cmd_output = e.output.decode('utf-8')
        error_message = u"[%s] error %s [%s] %s \n %s" % (e.cmd, cmd_output, apk_path, os.path.getsize(apk_path), aapt_cmd)
        #XXX: handle the exception on silent
        # we should treat it as success if find the package name and activity
        # just log it.
        logger.warning(error_message)

    if not cmd_output:
        raise subprocess.CalledProcessError(-1, aapt_cmd, cmd_output)
    return cmd_output


class SdkVersion:
    '''
    This class is to store different values for uses-sdk in AndroidManfest.xml.

    More info could be found:
    http://developer.android.com/guide/topics/manifest/uses-sdk-element.html
    '''

    def __init__(self):
        self.min = 0
        self.target = 0
        self.max = 0


class ApkInfo:
    def __init__(self, path):
        self.file_path = path

        # apk info
        self.package_name = None
        self.version_code = None
        self.version_name = None

        # sdk version
        self.sdk_version = SdkVersion()

        # native code
        self.native_code = None

        # launchable activities
        self.application_info = {}
        self.launchable_activities = []

        # permissions
        self.uses_permissions = []

        # features
        self.required_uses_features = []
        self.optional_uses_features = []

        # libraries
        self.required_uses_libraries = []
        self.optional_uses_libraries = []

        # raw info
        self.raw_info = dump_badging(path)

        self.__parse_apk_info()

    def __parse_apk_info(self):
        lines = self.raw_info.split('\n')
        for line in lines:
            if line.startswith('package:'):
                # parse name, version_code, version_name
                self.package_name = self.parse_value('name', '=', line)
                self.version_code = self.parse_value('versionCode', '=', line)
                self.version_name = self.parse_value('versionName', '=', line)
                continue

            if line.startswith('sdkVersion:'):
                # parse min sdk version
                self.sdk_version.min = int(self.parse_value('sdkVersion', ':', line))
                continue

            if line.startswith('targetSdkVersion:'):
                # parse target sdk version
                self.sdk_version.target = int(self.parse_value('targetSdkVersion', ':', line))
                continue

            if line.startswith('maxSdkVersion:'):
                # parse max sdk version
                self.sdk_version.max = int(self.parse_value('maxSdkVersion', ':', line))
                continue

            if line.startswith('uses-permission:'):
                # parse uses-permission
                self.uses_permissions.append(self.parse_value('uses-permission', ':', line))
                continue

            if line.startswith('launchable-activity:'):
                # parse launchable activity
                activity = {'name': self.parse_value('name', '=', line),
                            'label': self.parse_value('label', '=', line),
                            'icon': self.parse_value('icon', '=', line)}
                self.launchable_activities.append(activity)
                continue

            if line.startswith('uses-feature:'):
                # parse required uses-feature
                self.required_uses_features.append(self.parse_value('uses-feature', ':', line))
                continue

            if line.startswith('uses-feature-not-required:'):
                # parse optional uses-feature
                self.optional_uses_features.append(self.parse_value('uses-feature-not-required', ':', line))
                continue

            if line.startswith('application:'):
                # parse application infomation
                self.application_info['label'] = self.parse_value('label', '=', line)
                self.application_info['icon'] = self.parse_value('icon', '=', line)
                continue

            if line.startswith('uses-library:'):
                # parse required uses-library
                self.required_uses_libraries.append(self.parse_value('uses-library', ':', line))
                continue

            if line.startswith('uses-library-not-required:'):
                # parse optional uses-library
                self.optional_uses_libraries.append(self.parse_value('uses-library-not-required', ':', line))
                continue

            if line.startswith('native-code:'):
                # parse native code arch
                self.native_code = line[line.find(':') + 1:].strip().replace("'", '').split()
                continue

    def parse_value(self, key, sep, str, default=None):
        regex = ur".*%s%s'([^']*)" % (key, sep)
        r = re.match(regex, str)
        if r is not None:
            return r.group(1)
        return default

    def extract_icon(self, output_dir, output_name=None):
        """
        The icon is picked by checking against the rules below (priority: high -> low):
        1) The one with both "hdpi" and "en" qualifier
        2) The one with "hdpi" qualifier
        3) The default one
        """

        output_icon = self.application_info['icon']
        name = os.path.basename(self.application_info['icon'])

        import zipfile

        zip_file = zipfile.ZipFile(self.file_path, 'r')
        icons = [icon for icon in zip_file.namelist() if
                 icon.find("/%s" % name) > 0 and icon.find('-hdpi') > 0]

        if len(icons) > 0:
            output_icon = icons[0]

        if len(icons) > 1:
            for icon in icons:
                if icon.find("-en-") > 0:
                    output_icon = icon
        if not output_name:
            output_name = os.path.basename(output_icon)
        output_file_path = os.path.join(output_dir, output_name)
        with open(output_file_path, 'w') as f:
            f.write(zip_file.read(output_icon))
        zip_file.close()

        return output_file_path


def find_path(zip_file, file_type):
    name_list = zip_file.namelist()
    pattern = re.compile(r'^Payload\/.+\.app\/AppIcon60x60@.+\.png') if file_type == 'icon' \
        else re.compile(r'Payload/[^/]*.app/Info.plist')
    for path in name_list:
        m = pattern.match(path)
        if m is not None:
            return m.group()


def get_icon_file(zip_obj, plist_root, output_name):
    icon_file_regx = re.compile(r'Payload/.+?\.app/AppIcon60x60@.+\.png/$')
    filenames = zip_obj.namelist()
    filename = ''
    for fname in filenames:
        if icon_file_regx.search(fname):
            filename = fname
            break

    if not filename and plist_root:
        icons = plist_root.get('CFBundleIconFiles')
        if icons and len(icons):
            icon_file_regx = re.compile(r'Payload/.+?\.app/' + icons[-1])
            for fname in filenames:
                if icon_file_regx.search(fname):
                    filename = fname
                    break

        CFBundleIcons = plist_root.get('CFBundleIcons')
        if CFBundleIcons:
            CFBundlePrimaryIcon = CFBundleIcons.get('CFBundlePrimaryIcon')
            if CFBundlePrimaryIcon:
                icons = CFBundlePrimaryIcon.get('CFBundleIconFiles')
                if icons and len(icons):
                    icon_file_regx = re.compile(r'Payload/.+?\.app/' + icons[-1])
                    for fname in filenames:
                        if icon_file_regx.search(fname):
                            filename = fname
                            break

        if output_name and filename:
            with open(output_name, 'w') as f:
                content = zip_obj.read(filename)
                f.write(content)
            updatePNG(output_name)

    return filename


def getNormalizedPNG(filename):
    pngheader = "\x89PNG\r\n\x1a\n"

    file = open(filename, "rb")
    oldPNG = file.read()
    file.close()

    if oldPNG[:8] != pngheader:
        return None

    newPNG = oldPNG[:8]
    chunkPos = len(newPNG)
    idatAcc = ""
    breakLoop = False

    # For each chunk in the PNG file
    while chunkPos < len(oldPNG):
        skip = False

        # Reading chunk
        chunkLength = oldPNG[chunkPos:chunkPos + 4]
        chunkLength = unpack(">L", chunkLength)[0]
        chunkType = oldPNG[chunkPos + 4: chunkPos + 8]
        chunkData = oldPNG[chunkPos + 8:chunkPos + 8 + chunkLength]
        chunkCRC = oldPNG[chunkPos + chunkLength + 8:chunkPos + chunkLength + 12]
        chunkCRC = unpack(">L", chunkCRC)[0]
        chunkPos += chunkLength + 12

        # Parsing the header chunk
        if chunkType == "IHDR":
            width = unpack(">L", chunkData[0:4])[0]
            height = unpack(">L", chunkData[4:8])[0]

        # Parsing the image chunk
        if chunkType == "IDAT":
            # Store the chunk data for later decompression
            idatAcc += chunkData
            skip = True

        # Removing CgBI chunk
        if chunkType == "CgBI":
            skip = True

        # Add all accumulated IDATA chunks
        if chunkType == "IEND":
            try:
                # Uncompressing the image chunk
                bufSize = width * height * 4 + height
                chunkData = decompress(idatAcc, -15, bufSize)
            except Exception, e:
                # The PNG image is normalized
                print e
                return None
            chunkType = "IDAT"
            # Swapping red & blue bytes for each pixel
            newdata = ""
            for y in xrange(height):
                i = len(newdata)
                newdata += chunkData[i]
                for x in xrange(width):
                    i = len(newdata)
                    newdata += chunkData[i + 2]
                    newdata += chunkData[i + 1]
                    newdata += chunkData[i + 0]
                    newdata += chunkData[i + 3]
            # Compressing the image chunk
            chunkData = newdata
            chunkData = compress(chunkData)
            chunkLength = len(chunkData)
            chunkCRC = crc32(chunkType)
            chunkCRC = crc32(chunkData, chunkCRC)
            chunkCRC = (chunkCRC + 0x100000000) % 0x100000000
            breakLoop = True

        if not skip:
            newPNG += pack(">L", chunkLength)
            newPNG += chunkType
            if chunkLength > 0:
                newPNG += chunkData
            newPNG += pack(">L", chunkCRC)
        if breakLoop:
            break
    return newPNG


def updatePNG(filename):
    data = getNormalizedPNG(filename)
    if data != None:
        file = open(filename, "wb")
        file.write(data)
        file.close()
        return True
    return data


def get_app_package_info(file_path):
    apk_details = {}
    icon_path = os.path.splitext(file_path)[0] + '.png'
    if file_path.endswith('.apk'):
        apk_info = ApkInfo(file_path)
        apk_info.extract_icon(os.path.dirname(file_path), os.path.basename(icon_path))
        apk_details['package_name'] = apk_info.package_name or ''
        apk_details['app_name'] = apk_info.application_info['label'].encode('utf-8') or apk_info.launchable_activities[0]['label'].encode('utf-8')
        apk_details['main_activity'] = apk_info.launchable_activities[0]['name'] or ''
        apk_details['min_sdk_version'] = str(apk_info.sdk_version.min)
        apk_details['version'] = apk_info.version_name
        apk_details['build'] = apk_info.version_code or ''
        apk_details['release_type'] = ''

    elif file_path.endswith('.ipa'):
        ipa_file = zipfile.ZipFile(file_path)
        plist_path = find_path(ipa_file, 'plist')

        plist_data = ipa_file.read(plist_path)
        plist_root = biplist.readPlistFromString(plist_data)
        apk_details['package_name'] = plist_root.get('CFBundleIdentifier')
        apk_details['app_name'] = plist_root.get('CFBundleDisplayName') or plist_root.get('CFBundleName')
        apk_details['main_activity'] = '',
        apk_details['min_sdk_version'] = plist_root.get('MinimumOSVersion')
        apk_details['version'] = plist_root.get('CFBundleShortVersionString')
        apk_details['build'] = plist_root.get('CFBundleVersion')
        apk_details['release_type'] = 'app store'

        read_icon_path = get_icon_file(ipa_file, plist_root, icon_path)
        if not read_icon_path:
            import requests
            r = requests.get('http://tphone-files.testbird.com/ios_default_icon.png')
            if r.status_code == 200:
                with open(icon_path, 'wb') as f:
                    f.write(r.content)

    return apk_details



