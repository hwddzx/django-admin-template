(function() {
    angular.module('quail.report')
        .animation('.repeat-left-in', repeatLeftIn)
        .animation('.repeat-right-in', repeatRightIn);

    function repeatLeftIn() {
        return {
            enter: function(element, done) {
                element.css({
                        position: "relative",
                        left: "-20px"
                    })
                    .animate({
                        left: 0
                    }, 500, done);
            }
        };
    }

    function repeatRightIn() {
        return {
            enter: function(element, done) {
                element.css({
                        position: "relative",
                        left: "20px"
                    })
                    .animate({
                        left: 0
                    }, 500, done);
            }
        };
    }

})();
