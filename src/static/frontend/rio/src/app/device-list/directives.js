(function() {
    angular.module('device-list')
        .directive('flexSliderCarousel', flexSliderCarousel);

    function flexSliderCarousel() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                setTimeout(function() {
                    element.flexslider({
                        animation: "slide",
                        slideshow: true,
                        prevText: "",
                        nextText: "",
                        directionNav: true,
                        pauseOnHover:true,
                        customDirectionNav: '.flex-direction-nav .flex-arrow',
                        animationSpeed: 800,
                        slideshowSpeed: 5000
                    });
                }, 0);
            }
        }
    }
})();
