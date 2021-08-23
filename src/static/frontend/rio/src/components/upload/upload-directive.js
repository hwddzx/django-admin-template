angular.module('stf.upload')
    .directive("rioUpload", rioUpload)
    .directive("apkFiles", apkFiles)
    .directive("uploadBadge", uploadBadge)
    .directive("rioUploadProgressbar", rioUploadProgressbar);

function rioUpload() {

    return {
        restrict: 'A',
        templateUrl: 'components/upload/upload.html',
        controller: function($rootScope, $scope, $timeout, config, DialogService, UploadService, RioService, StorageService, TbUploadService) {

            $scope.upload = null;
            $scope.parse = null;
            $scope.installation = null;

            $scope.$on('upload:start', function(e, upload) {
                $scope.parse = null;
                $scope.listenUploadProgress(upload);
            });

            $scope.$on("install:start", function(event, installation) {
                $scope.installation = installation;
                installation.on("change", function() {
                    if (installation.state == 'installed') {
                        $scope.installation = null;
                    }
                });
            });

            $scope.reset = function() {
                if ($scope.parse && $scope.parse.errorMsg) {
                    $scope.parse = null;
                    $scope.uploader.cancel();
                    return;
                }
                if ($scope.upload) {
                    $scope.upload = null;
                    return;
                }
                if ($scope.installation && $scope.installation.state == 'error') {
                    $scope.installation = null;
                    return;
                }
            }

            $scope.listenUploadProgress = function(upload) {
                $scope.upload = upload.apply($scope);
                upload.on("change", function() {
                    if (upload.state == "uploaded") {
                        $timeout(function() {
                            $scope.upload = null;
                        }, 500);
                    }
                    $scope.dummyProgress = upload.dummyProgress;
                })
            };

            $scope.startUpload = function() {
                StorageService.setDeviceHost(RioService.getCurrentRioDevice().host);
                UploadService.uploadFile($scope.uploader)
            };

            $scope.cancelUpload = function() {
                $scope.parse = null;
                if (UploadService.getUploadInstance()) {
                    $scope.upload = null;
                    UploadService.cancelUpload();
                }
                $scope.uploader.cancel();
            };

            _activate();

            function _activate() {

                var uploadInstance = UploadService.getUploadInstance();

                if (uploadInstance) {
                    //进入设备控制页面时，如果有上传实例，则监听上传的进度
                    $scope.listenUploadProgress(uploadInstance);
                }

                TbUploadService.getUploadService().bind({
                    browseButton: 'pickfiles'
                }).then(function(uploader) {
                    var defaultIcons = {
                        ios: "http://tphone-files.testbird.com/ios_default_icon.png",
                        android: "http://tphone-files.testbird.com/android_default_icon.png"
                    };
                    uploader.failed = function (up, error, errorTips) {
                        if (error.code == plupload.FILE_SIZE_ERROR) {
                            DialogService.alert('文件大小不能超过4G，上传失败');
                        }
                    };
                    uploader.onFileAdded = function() {
                        $scope.uploader = uploader;
                        $scope.parse = {
                            state: 'parse_progress'
                        };
                        if (!_.includes(["apk", "ipa"], uploader.file.name.split(".").pop())) {
                            $scope.parse.errorMsg = "文件解析失败，请上传正确格式的app!";
                            $scope.$digest();
                            return
                        }
                        AppBundleInfo.readApp(uploader.file.getNative(), uploader.fileName)
                            .done(function(appBundle) {
                                // Not allowed upload appstore ipa
                                if (appBundle.release.release_type == "appstore") {
                                    $scope.parse.errorMsg = "请上传Development开发版本、Ad Hoc内测版本或者In House企业版本!";
                                    $scope.$digest();
                                    return
                                }

                                _fixLabel(appBundle.app);

                                $scope.parse.state = 'parse_finish';
                                $scope.parse.iconBlobUrl = appBundle.iconBlob ? window.URL.createObjectURL(appBundle.iconBlob) : defaultIcons[appBundle.app.type];
                                $scope.parse.name = appBundle.app.name || 'unknown';
                                $scope.parse.fileName = uploader.fileName;
                                $rootScope.appInfo = appBundle.app;
                                $rootScope.parseInfo = $scope.parse;

                                $scope.$digest();
                            })
                            .fail(function(){
                                $scope.parse.errorMsg = "文件解析失败，请重试!";
                                $scope.$digest();
                            });
                    };
                });

                // 个别特殊的app label解析乱码 暂时特殊处理
                function _fixLabel(app) {
                    var specialApp = [{package: "com.ets.taxcalculator", label: "个税计算器"}, {package: "com.srcb.mbank", label: "上海农商银行SRCB"}],
                        findApp = _.find(specialApp, {package: app.package_name});

                    if (findApp) {
                        app.name =  findApp.label;
                    }
                }

            }

        },
        link: function(scope, element, attr) {
            scope.installAvailable = attr.installAvailable;
        }
    }
}

function rioUploadProgressbar($timeout) {
    return {
        restrict: "A",
        scope: {},
        replace: true,
        templateUrl: 'components/upload/upload.progressbar.html',
        link: function(scope, element, attr) {
            scope.$on('upload:start', function(e, upload) {
                element.show();
                scope.upload = upload.apply(scope);
                upload.on("change", function() {
                    if (upload.settled) {
                        var $tips = element.children(upload.success ? ".upload-tips-done" : ".upload-tips-error");
                        element.addClass("none-height");
                        $tips.slideDown().delay(3000).slideUp(function() {
                            element.hide();
                            element.removeClass("none-height");
                            element.children(".progress-bar").width("0");
                        })
                    }
                })
            })
        }
    }
}

function apkFiles() {
    return {
        restrict: 'A',
        templateUrl: 'components/upload/files.html',
        controller: function($scope, $timeout, InstallService, StorageService, config) {

            var REMOTE_FILE_TYPE = 'remote';

            $scope.files = [];

            $scope.isTipsHide = localStorage.getItem('hideUploadTips');

            $scope.hideTips = function() {
                localStorage.setItem('hideUploadTips', 'true');
                $scope.isTipsHide = true;
            }

            $scope.install = function(file) {
                if (!$scope.isDisableInstall(file)) {
                    file.installation = null;
                    InstallService.install($scope.control, file)
                }
            }

            $scope.isInstallError = function(file) {
                return file.installation && file.installation.error;
            }

            $scope.isDisableInstall = function(file) {
                return file.installation && !file.installation.error && !file.installation.success;
            }

            $scope.$on("install:end", function () {
                getApkFiles();
            })

            $scope.$on("uploaded", function() {
                getApkFiles().then(function(files) {
                    if ($scope.installAvailable && files.length) {
                        $scope.install(files[0].type ? files[1] : files[0]);
                    }
                })
            })

            getApkFiles();

            function getApkFiles() {
                return InstallService.getApkFiles().then(function(data) {
                    var remoteApk = config.apk;
                    $scope.files = data;
                    if (remoteApk) {
                        remoteApk.type = REMOTE_FILE_TYPE;
                        $scope.files.unshift(remoteApk);
                        if ($scope.files.length > 3) {
                            $scope.files.pop();
                        }
                    }
                    return $scope.files;
                })
            };
        }
    }
}

function uploadBadge($rootScope) {
    var MAX_UPLOAD_COUNT = 3,
        uploadCount = 0;
    return {
        scope: {},
        link: function(scope, element, attr) {

            element.addClass("upload-badge");
            element.parent().addClass("upload-badge-wrap");

            if (uploadCount) {
                element.html(uploadCount);
                element.addClass("show");
            }

            $rootScope.$on("uploaded", function(event, data) {
                if (!isUploadModalShow()) {
                    if (uploadCount < MAX_UPLOAD_COUNT && !data.transfer) {
                        uploadCount++;
                    }
                    data.transfer = true;
                    element.html(uploadCount);
                    element.addClass("show");
                }
            })

            $rootScope.$on("clear:upload:badge", function() {
                uploadCount = 0;
                element.removeClass("show")
                element.html(uploadCount);
            })

            function isUploadModalShow() {
                return $(".rio-upload-modal").length || ($("#modal-upload").length && !$("#modal-upload").hasClass("ng-hide"));
            }
        }
    }
}
