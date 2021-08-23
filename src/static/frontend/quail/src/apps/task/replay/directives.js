(function () {
    angular.module('quail.task.replay')
        .directive("tbShowProgress", tbShowProgress)
        .directive("changeImgWidth", changeImgWidth);

    function tbShowProgress($compile) {

        return {
            restrict: 'A',
            scope: {
                progress: "="
            },
            link: function (scope, element, attributes) {
                scope.getProgress = getProgress;
                scope.getWidth = getWidth;

                element.css('text-align', 'left');
                element.append('<div class="progress"></div><div class="progress progress-bar" ng-style="'
                    + "{'width': getWidth()}"
                    + '"><span class="progress-number">{{ getProgress() }}</span></div>');
                $compile(element.contents())(scope);

                function getWidth() {
                    return element.find(".progress").width() * scope.progress;
                }

                function getProgress() {
                    return parseInt(scope.progress * 100) + "%"
                }
            }
        }
    }

    function changeImgWidth() {
        return {
            restrict: 'A',
            link: function (scope, element) {
                element[0].onload = function () {
                    if (this.width > this.height) {
                        element.width(280)
                    }
                }
            }
        }
    }
})();
