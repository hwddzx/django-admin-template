angular.module('stf.upload')
    .factory('UploadService', UploadService)
    .factory('UploadModalService', UploadModalService);

function UploadModalService($uibModal, config) {
    return {
        open: function() {
            return $uibModal.open({
                templateUrl: 'components/upload/upload.modal.html',
                size: 'lg',
                controller: function($scope, $uibModalInstance) {

                    $scope.cancel = function() {
                        $uibModalInstance.dismiss();
                    }
                    $scope.close = function() {
                        $uibModalInstance.close();
                    }
                }
            })
        }
    }
}

function UploadService($rootScope, $http) {
    var uploadInstance = null;

    function Upload(state) {
        this.progress = 0
        this.state = state
        this.settled = false
        this.success = false
        this.error = null
        this.href = null
        this.dummyProgress = false;
    }

    Upload.prototype = Object.create(EventEmitter.prototype)
    Upload.prototype.constructor = Upload

    Upload.prototype.apply = function($scope) {
        function changeListener() {
            // $scope.safeApply()
            //TODO need reset
            if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
                $scope.$apply();
            }
        }

        this.on('change', changeListener)

        $scope.$on('$destroy', function() {
            this.removeListener('change', changeListener)
        }.bind(this))

        return this
    }

    Upload.prototype.update = function(progress, state) {
        this.progress = Math.floor(progress)
        this.state = state
        this.emit('change')
    }

    Upload.prototype.okay = function(state) {
        this.settled = true
        this.progress = 100
        this.success = true
        this.state = state
        this.emit('change')
        $rootScope.$broadcast("uploaded", {
            transfer: false
        });
    }

    Upload.prototype.fail = function(err) {
        this.settled = true
        this.progress = 100
        this.success = false
        this.error = err
        this.emit('change')
    }

    return {
        getUploadInstance: function() {
            return uploadInstance;
        },
        cancelUpload: function() {
            uploadInstance.fail("????????????!");
            uploadInstance = null;
        },
        uploadFile: function(uploader) {

            if (uploadInstance) {
                return;
            }

            uploadInstance = new Upload('uploading');

            $rootScope.$broadcast('upload:start', uploadInstance);

            uploader.failed = function(up, error, errorTips) {
                uploadInstance.fail(errorTips || error.message || "????????????");
                uploadInstance = null
            };


            function _dummyProgress(fileSize) {
                uploadInstance.dummyProgress = true;

                var percent = uploadInstance.progress,
                    // ???????????????????????? ?????????5000kb/s????????????500kb/s
                    kbs = config.isLab() ? 5000 : 500,
                    // ??????????????????(30????????????????????????????????????)
                    time = Math.round(fileSize / kbs / 30),
                    timer = null;

                timer = setInterval(function() {
                    if (percent == 100) {
                        clearInterval(timer);
                        uploadInstance.okay('uploaded');
                        uploadInstance = null;
                    } else {
                        uploadInstance.update(++percent, 'uploading');
                    }
                }, time)
            }

            uploader.successed = function(file) {
                var appInfo = $rootScope.appInfo,
                    parse = $rootScope.parseInfo;

                return $http.post("/api/rio/app/upload/", { file_name: parse.name, size: file.size, file_url: file.link ,package_name: appInfo.package_name, version: appInfo.version}).then(function(res) {

                    _dummyProgress(file.size);

                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'UserAction',
                        eventAction: 'upload',
                        eventLabel: file.name
                    });
                    return res.data;
                });
            };

            uploader.uploadProgress = function(percent) {
                // ???????????????????????????70%,??????30%??????????????????
                var calcPercent = Math.floor(percent * (70 / 100));
                uploadInstance && uploadInstance.update(calcPercent, 'uploading')
            };

            uploader.start();

        }
    }
}
