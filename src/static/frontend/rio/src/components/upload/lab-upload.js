(function() {

    angular.module('qiniu.upload')
        .factory('LabUploadService', LabUploadService);

    function LabUploadService($http, $q) {

        var labServerUrl = "";//http://10.10.10.12/upload/

        return {
            getServerUrl: function() {
                return labServerUrl ? $q.when(labServerUrl) : $http.get("/api/app/uptoken/build/").then(function(res) {
                    return (labServerUrl = res.data.domain);
                });
            },
            bind: function(options) {
                var self = this;
                return this.getServerUrl().then(function() {
                    return self.init(options);
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

                var pluploadInstance = new plupload.Uploader({
                    runtimes: 'html5,flash,html4', //上传模式,依次退化
                    browse_button: options.browseButton, //上传选择的点选按钮，**必需**
                    max_file_size: '4096mb', //最大文件体积限制
                    flash_swf_url: 'js/plupload/Moxie.swf', //引入flash,相对路径
                    max_retries: 0, //上传失败最大重试次数
                    dragdrop: true, //开启可拖曳上传
                    method: "PUT",
                    url: labServerUrl,
                    drop_element: options.browseButton, //拖曳上传区域元素的ID，拖曳文件或文件夹后可触发上传
                    chunk_size: 0, //分块上传时，每片的体积
                    multipart: false,
                    multi_selection: false,
                    init: {
                        'Init': function(up) {
                            uploader.start = function() {
                                up.start();
                            }
                            uploader.cancel = function() {
                                for (var index = up.files.length - 1; index >= 0; index--) {
                                    up.removeFile(up.files[index]);
                                }
                            }
                        },
                        'FilesAdded': function(up, files) {
                            file = files[0];
                            // 对于iOS安装文件，后缀为ipa。此外，全部为apk
                            file.extName = (file.name.split('.').pop() == 'ipa') ? 'ipa' : 'apk';
                            file.link = labServerUrl + self.getFileKey(file);
                            uploader.file = file;
                            up.setOption({
                                url: file.link
                            });

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
                            //修改为单文件模式后，文件上传后就调用成功的回调，不再判断已上传的文件个数
                            uploader.successed(up.files[0]);
                            uploader.cancel();
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

                pluploadInstance.init();

                return $q.when(uploader);
            },
            upload: function(blob, key, extName) {
                var key = key || this.getFileKey(blob, extName),
                    url = labServerUrl + key;
                return this.getServerUrl().then(function() {
                        $http.put(url, blob, {
                            withCredentials: false,
                            transformRequest: angular.identity,
                            headers: {
                                'Content-Type': undefined,
                                'Authorization': undefined,
                                'Token': undefined
                            }
                        });
                    })
                    .then(function() {
                        return url;
                    });
            },
            getFileKey: function(file, extName) {
                return Date.now() + "_" + file.size + '.' + (extName || file.extName || 'png');
            }
        };


    }


})();
