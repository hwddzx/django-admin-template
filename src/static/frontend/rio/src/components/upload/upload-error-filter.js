  angular.module('stf.upload')
      .filter('uploadError', uploadErrorFilter)

  function uploadErrorFilter(gettext) {
      /*jshint maxlen:200*/
      return function(text) {
          switch (text) {
              // Our error codes.
              case "no_input_files":
                  return gettext("请选择apk文件上传!")
              default:
                  return gettext(text)
          }
      }
  }
