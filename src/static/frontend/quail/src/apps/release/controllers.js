(function() {
    angular.module('quail.release')
        .controller('ReleasesCtrl', ReleasesController)

    function ReleasesController($q, $state, $scope, AppService, ReleaseService, DialogService, releases) {

        $scope.releases = releases;
        $scope.onFileUploaded = onFileUploaded;
        $scope.deleteRelease = deleteRelease;

        $scope.app.package_name = $scope.releases[0].package_name;

        function deleteRelease(releaseKey) {
            DialogService.confirm('确定删除当前版本！').then(function() {
                return ReleaseService.deleteRelease($scope.app.key, releaseKey);
            }).then(function() {
                _.remove($scope.releases, {key: releaseKey});
            });
        }

        function onFileUploaded(data) {
            var app = data.app,
                release = data.release,
                promise = $q.when(),
                uuid = release.download_url.match(/[a-z0-9]{32}/ig);

            if (data.uploadApkType !== "withEspresso" && !_.isUndefined(release.signType)) {
                $scope.isSigning = true;
                promise = AppService.resignApp(release).then(function(data) {
                    release.download_url = data.resignedApkUrl;
                    release.espresso_apk_url = data.espressoApkUrl;
                }).finally(function() {
                    $scope.isSigning = false;
                });
            }

            return promise.then(function(data) {
                // 取上传app文件名第二个uuid作为key
                release.key = uuid[1];
                return ReleaseService.saveRelease(app.key, release);
            }).then(function() {
                $state.reload();
            });
        }

    }

})();