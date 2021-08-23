angular.module("rio.app")
    .controller("HeadCtrl", HeadController);

function HeadController($rootScope, $scope, $cookies, UploadModalService, config) {
    $scope.dtUrl = config.urls.dt;
    $scope.config = config;
    $scope.head_state = location.href.indexOf("rio/devices")> -1 ? "远程真机调试" : "使用明细";
    $scope.head_state_title = location.href.indexOf("rio/devices")> -1 ? "使用明细" : "远程真机调试";

    $scope.openUploadModal = function() {
        $rootScope.$broadcast("clear:upload:badge");
        UploadModalService.open();
    };
    $scope.chongzhi = function(){
      location.href = location.href.indexOf('stage')>-1 ? "http://stage-dt.testbird.com/home/order?next_url=new_home/index.html" : "http://dt.testbird.com/home/order?next_url=new_home/index.html";
    }

    $scope.redirect = function(url) {
        window.open(config.urls.dt + (url || ""));
    };

    $scope.logout = function() {
        var hostname = window.location.hostname;
        $cookies.remove("dt_session", {
            path: "/",
            domain: ".testbird.com"
        });
        $cookies.remove("site_profile", {
            path: "/"
        });
        window.location = _.URI.join(config.urls.dt, "login");
    }

}
