(function() {
    angular.module('report_v2', ['ui.router', 'ngAnimate']).run(function($rootScope) {
        $rootScope.$on("$stateChangeSuccess", function(event, toState, toParams, fromState, fromParams) {
            setTimeout(function() {
                $(".tb-nav-tabs li").removeClass("active");
                $(".to" + toState.target).addClass("active");
                $rootScope.$broadcast("toState", toState);
            })
        });
    });
})();
