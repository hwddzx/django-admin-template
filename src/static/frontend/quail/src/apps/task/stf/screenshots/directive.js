angular.module('quail.screenshots').directive('tbBlinkBlock', tbBlinkBlock);

function tbBlinkBlock() {
    return {
        restrict: 'A',
        link: function(scope, ele, attr) {
            scope.$on('deviceControl:showInvalidAreaHint', function() {
                _.times(attr.times || 1, function() {
                    $(ele).fadeIn().delay(attr.delay || 2000).fadeOut();
                });
            });
        }
    }
}
