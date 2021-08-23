(function() {
    angular.module('qiniu.upload', [])
        .factory('QiNiuUploadService', QiNiuUploadService)
        .factory('TbUploadService', TbUploadService);

    function TbUploadService(config, QiNiuUploadService, LabUploadService) {
        return {
            getUploadService: function() {
                return config.releaseEnv == 'lab' ? LabUploadService : QiNiuUploadService;
            },
            getGUID: function() {
                var S4 = function() {
                    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
                };
                return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
            }
        };
    }

    function QiNiuUploadService($http) {

        var downloadDomain = "",
            qiniuToken = null,
            QINIU_UPLOAD_URL = 'http://upload.qiniu.com/';

        return {
            getServerUrl: function() {
                return $q.when(QINIU_UPLOAD_URL);
            },
            getDownloadDomain: function() {
                return downloadDomain;
            },
            getQiniuToken: function() {
                return $http.get("/api/app/uptoken/build/").then(function(res) {
                    downloadDomain = res.data.domain;
                    return res.data;
                });
            },
            bind: function(options) {
                var self = this;
                return this.getQiniuToken().then(function(qiniuToken) {
                    return self.init(_.extend(options, qiniuToken));
                });
            },
            init: function(options) {
                var self = this,
                    uploader = {
                        uploadProgress: function() {},
                        fileUploaded: function() {},
                        failed: function() {},
                        successed: function() {},
                    };
                Qiniu.uploader({
                    runtimes: 'html5,flash,html4', //上传模式,依次退化
                    browse_button: options.browseButton, //上传选择的点选按钮，**必需**
                    uptoken: options.uptoken,
                    domain: options.domain,
                    // container: options.container, //上传区域DOM ID，默认是browser_button的父元素，
                    max_file_size: '4096mb', //最大文件体积限制
                    flash_swf_url: 'js/plupload/Moxie.swf', //引入flash,相对路径
                    max_retries: 0, //上传失败最大重试次数
                    dragdrop: true, //开启可拖曳上传
                    method: 'POST',
                    drop_element: options.browseButton, //拖曳上传区域元素的ID，拖曳文件或文件夹后可触发上传
                    chunk_size: '4mb', //分块上传时，每片的体积
                    init: {
                        'Init': function(up) {
                            uploader.start = function() {
                                self.getQiniuToken().then(function(data) {
                                    Qiniu.token = data.uptoken;
                                    up.start();
                                }).catch(function() {
                                    uploader.failed(up, null, "获取TOKEN失败，请重新上传!");
                                });
                            }
                            uploader.cancel = function() {
                                for (var index = up.files.length - 1; index >= 0; index--) {
                                    up.removeFile(up.files[index]);
                                }
                            }
                        },
                        'FilesAdded': function(up, files) {
                            file = files[0];
                            file.extName = file.name.split('.').pop();
                            uploader.file = file;

                            if (up.state != plupload.STARTED) {
                                uploader.fileName = file.name;
                                uploader.onFileAdded();
                            }
                        },
                        'BeforeUpload': function(up, file) {
                            // 每个文件上传前,处理相关的事情
                        },
                        'UploadProgress': function(up, file) {
                            var uploadSpeed = up.total.bytesPerSec / (1024 * 1024),
                                speedText = uploadSpeed.toFixed(2) + 'mb/s';
                            uploader.uploadProgress(up.total.percent, speedText, up);
                        },
                        'FileUploaded': function(up, file, info) {
                            var domain = up.getOption('domain');
                            var res = JSON.parse(info);
                            file.link = domain + res.key;
                            //修改为单文件模式后，文件上传后就调用成功的回调，不再判断已上传的文件个数
                            uploader.successed(up.files[0])
                            uploader.cancel();
                            //uploader.finally(uploader.cancel);
                        },
                        'Error': function(up, err, errTip) {
                            uploader.cancel();
                            uploader.failed.apply(null, arguments);
                        },
                        'UploadComplete': function(up) {},
                        'Key': function(up, file) {
                            return self.getFileKey(file);
                        }
                    }
                });

                return uploader;
            },
            upload: function(blob, key) {
                return this.getQiniuToken().then(function(data) {
                    var formData = new FormData();
                    formData.append('file', blob);
                    formData.append('token', data.uptoken);
                    formData.append('key', key);
                    return $http.post(QINIU_UPLOAD_URL, formData, {
                        withCredentials: false,
                        transformRequest: angular.identity,
                        headers: {
                            'Content-Type': undefined
                        }
                    });
                });

            },
            getFileKey: function(file, extName) {
                return Date.now() + "_" + file.size + '.' + (extName || file.extName || 'png');
            }
        };


    }


})();
