angular.module('stf.photo').controller('PhotoCtrl', PhotoCtrl);

function PhotoCtrl($scope, RioService, UploadService, TbUploadService, DialogService) {

    $scope.upload = null;

    $scope.cancelUpload = function () {
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
            browseButton: 'pickPictures'
        }).then(function (uploader) {
            uploader.onFileAdded = function () {
                $scope.uploader = uploader;
                if (!(_validateFileType(uploader.file.name.split('.').pop()))) {
                    return DialogService.error("请选择正确的图片文件");
                }
                if (uploader.file.size > 10000000) {  //文件大小不超过10mb
                    return DialogService.error("图片大小不能超过10MB");
                }
                var reader = new FileReader();
                reader.readAsDataURL(uploader.file.getNative()); //按字节读取文件内容，结果为文件的base64编码
                reader.onload = function(data) {
                    $scope.control.pictureUpload({
                        data: data.target.result.split(',')[1],
                        fileName: uploader.file.name
                    }).finally(function () {
                        DialogService.alert("图片上传成功，请点击手机相册查看");
                    })
                }
            };
        });

    }

    function _validateFileType(type) {
        return type == 'png' || type == 'jpg' || type == 'jpeg' || type == 'PNG' || type == 'JPG' || type == 'JPEG';
    }
}
