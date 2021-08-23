(function(){
    angular.module("quail.lab-drop-down", [])
        .directive("labAppsDropDown", labAppsDropDown);

    function labAppsDropDown() {
        return {
            scope: {dtUrl: "=", app: "=", apps: "=", toState: "&"},
            templateUrl: "components/lab/lab.apps.dropdown.html",
            controller: function($scope, TESTCASE_ENUM){
                $scope.completionStatus = TESTCASE_ENUM.completionStatus;
                $scope.model = {
                    searchName: "",
                    disableSearchThreshold: 10 //apps个数超过disableSearchThreshold值才显示查询
                };

                $scope.isOwner = localStorage.getItem("role") == "owner";

                $scope.stopPropagation = function(e) {
                    e.stopPropagation();
                };

                $scope.filterJoinApp = function(app) {
                    return !$scope.model.searchJoinName || app.name.toLowerCase().indexOf($scope.model.searchJoinName.toLowerCase()) > -1;
                };

                $scope.filterCreateApp = function(app) {
                    return !$scope.model.searchCreateName || app.name.toLowerCase().indexOf($scope.model.searchCreateName.toLowerCase()) > -1;
                };

            },
            link: function(scope, element) {
                $(element).on("click", ".dropdown", function() {
                    var top = 100,// 菜单距离浏览器顶部距离
                        menu = $(element).find(".apps-menu"),
                        windowHeight = $(window).height();
                    if (menu.height() + top > windowHeight) {
                        menu.css({"height": windowHeight - top + "px"});
                    } else {
                        menu.css({"height": "auto"});
                    }
                    $('.spliter-bar', element).height(menu.height() - 40);//顶部和底部各留20px
                });
            }
        }
    }
})();