(function() {

    angular.module("quail.snapshot-slider", [])
        .directive('tbSnapshotSlider', tbSnapshotSlider);

    function tbSnapshotSlider() {

        return {
            templateUrl: 'components/snapshot-slider/slider.html',
            scope: {
                snapshots: '=',
                limit: '='
            },
            controller: function($scope) {

                $scope.currentIndex = 0;

                $scope.sliderOptions = {
                    navArrow: false,
                    slidesToShow: $scope.limit || 3,
                    lazyLoad:true
                }

                $scope.slider = {};

                $scope.prevSnapshot = function() {
                    $scope.currentIndex = Math.max(--$scope.currentIndex, 0);
                    $scope.slider.slideTo($scope.currentIndex);
                }

                $scope.nextSnapshot = function() {
                    $scope.currentIndex = Math.min(++$scope.currentIndex, $scope.snapshots.length - $scope.sliderOptions.slidesToShow);
                    $scope.slider.slideTo($scope.currentIndex);
                }

                $scope.deleteSnapshot = function() {
                    $scope.snapshots = _.reject($scope.snapshots, function(item) {
                        return item.checked;
                    });
                }

            },
            link: function(scope, element, attrs) {
                scope.editable = attrs.editable == 'true' ? true : false;
            }
        }
    }

})();
