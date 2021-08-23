(function() {
    angular.module("plugin")
        .controller("pluginController", pluginController)
        .controller("uploadController", uploadController);

    function pluginController($state, $scope, UploadService, DialogService, ModalService, pluginService, plugins, PLUGIN_ENUM) {
        var vm = this;

        vm.plugins = plugins;
        vm.plugin = undefined;
        vm.app = $scope.app;

        vm.fileSelected = fileSelected;
        vm.deletePlugin = deletePlugin;
        vm.updatePlugin = updatePlugin;
        vm.setCurrentPlugin = setCurrentPlugin;
        vm.pluginTypeText = PLUGIN_ENUM.typeText;

        function fileSelected(uploader) {
            if (uploader.file.extName != 'zip') {
                return DialogService.alert('只允许上传zip后缀名的插件！');
            }
            ModalService.show({
                templateUrl: "apps/plugin/templates/upload.html",
                controller: "uploadController",
                controllerAs: "vm",
                resolve: {
                    uploader: function() {
                        return uploader;
                    },
                    app: function() {
                        return vm.app;
                    }
                }
            })
        }

        function deletePlugin(id) {
            DialogService.confirm("确定删除该插件吗?").then(_delete);

            function _delete() {
                pluginService.deletePlugin(id).then(function() {
                    _.remove(vm.plugins, function(plugin) {
                        return plugin.id == id;
                    })
                })
            }
        }

        function updatePlugin(uploader, plugin) {
            if (uploader.file.extName != 'zip') {
                return DialogService.alert('只允许上传zip后缀名的插件！');
            }
            var file = uploader.file.getNative(),
                name = vm.plugin.path.substring(vm.plugin.path.lastIndexOf("/") + 1);

            UploadService.upload(file, name, name.split(".")[1] || "zip").then(function(url){
                return pluginService.getPluginParams(file).always(function(params) {
                    pluginService.updatePlugin(plugin.id, {name: plugin.name, type: plugin.type, path: url, params: params}).then(function() {
                        return DialogService.alert("更新插件成功!");
                    }).finally(function() {
                        $state.reload();
                    });
                });
            });
        }

        function setCurrentPlugin(plugin) {
            vm.plugin = plugin;
        }
    }

    function uploadController($state, $uibModalInstance, UploadService, pluginService, uploader, app, PLUGIN_ENUM) {
        var vm = this;

        vm.uploader = uploader;
        vm.pluginName = "";
        vm.app = app;
        vm.pluginTypeEnum = PLUGIN_ENUM.pluginType;
        vm.pluginType = vm.pluginTypeEnum["plugin-dev"];
        vm.uploading = false;

        vm.cancel = cancel;
        vm.upload = upload;

        function cancel() {
            $uibModalInstance.close();
        }

        function upload() {
            vm.uploading = true;
            var file = vm.uploader.file.getNative();
            UploadService.upload(file, null, _getExtName(vm.uploader.fileName)).then(_upload);

            function _upload(url) {
                pluginService.getPluginParams(file).always(function(params) {
                    pluginService.uploadPlugin(vm.app.key, {name: vm.pluginName, type: vm.pluginType, path: url, params: params}).then(cancel).then(function() {
                        vm.uploading = false;
                        $state.reload();
                    })
                })
            }

            function _getExtName(name) {
                var array = name.split(".");
                return array.length > 1 ? array.pop() : "zip";
            }
        }
    }
})();