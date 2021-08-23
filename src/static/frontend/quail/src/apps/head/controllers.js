angular.module("quail.main")
    .controller("HeadCtrl", HeadController)

function HeadController($scope, $cookies, $state, AppClientService, AppService, FileService, config) {

    $scope.dtUrl = config.urls.dt;
    $scope.homePage = config.urls.official;
    $scope.config = config;
    $scope.nickName= $scope.config.nick_name;

    $scope.redirect = function(url) {
        window.open(config.urls.dt + (url || ""));
    };

    $scope.gotoAppDetail = function(key) {
        $state.go("app.testcases", { key: key, selectNodeId: "" })
    };

    $scope.logout = function() {
        var hostname = window.location.hostname;
        $cookies.remove("dt_session", {
            path: "/",
            domain: ".lab.tb"
        });
        $cookies.remove("site_profile", {
            path: "/"
        });
        window.location = _.URI.join(config.urls.quail, "login");
    };

    $scope.createApp = function() {
        AppClientService.createApp({
            key: $scope.app.key,
            data: $scope.apps,
            source: function() {
                return AppService.getAppList();
            },
            callback: function() {
                $state.go("app", {}, { reload: true, inherit: false });
            }
        });
    }

    $scope.toState = function(key, role) {
        if (role != localStorage.getItem("role")) {
            localStorage.setItem("role", role);
            $state.reload()
        }
        $state.params.key != key && $scope.gotoAppDetail(key);
    };

    $scope.download = function(url, name) {
        return FileService.downloadByUrl(url, name);
    }

}
