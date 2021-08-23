angular.module('stf.upload', [
        'gettext'
    ])
    .filter('uploadError', function(gettext) {
        return function(text) {
            return {
                'fail_invalid_app_file': gettext('Uploaded file is not valid'),
                'fail_download': gettext('Failed to download file'),
                'fail_invalid_url': gettext('Cannot access specified URL'),
                'fail': gettext('Upload failed')
            }[text] || gettext('Upload unknown error')
        }
    });
