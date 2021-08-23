(function() {
    angular.module('quail.picture', [])
        .service("PictureService", PictureService);

    function PictureService($http, $q, DialogService) {

        var service = {};

        service.getImageData = getImageData;
        service.getOcrValue = getOcrValue;

        return service;

        function getOcrValue(url, area) {
            return getImageData(url, area).then(function(data) {
                return $http.post("/api/foundation/ocr/", {
                    image: data.substr(22) //去除data:image/png;base64,
                }, {
                    ignoreErrHandler: true
                }).then(function(res) {
                    return res.data.text;
                }).catch(function(res) {
                    DialogService.alert("图片识别错误，请重新选择区域!");
                    return $q.reject(res);
                });
            });
        }

        function getImageData(url, area) {
            return _loadImage(url, area).then(_cutImageData);
        }

        function _cutImageData(options) {
            var base64Data = "",
                img = options.img,
                area = options.area;

            var $canvas = $("<canvas style='position:fixed;left:-9999px;top:-9999px;' width='" + area.w + "' height='" + area.h + "'></canvas>"),
                ctx = $canvas[0].getContext("2d");

            $('body').append($canvas);

            ctx.drawImage(img, area.x, area.y, area.w, area.h, 0, 0, area.w, area.h);

            base64Data = $canvas[0].toDataURL();
            $canvas.remove();

            return base64Data;
        }

        function _loadImage(url, area) {
            return $q(function(resolve, reject) {
                var img = new Image();
                //如果图片与当前页面不在同一域内，会受 canvas 的同源策略限制。 
                //http://stackoverflow.com/questions/22710627/tainted-canvases-may-not-be-exported
                img.crossOrigin = "anonymous";
                img.onload = function() {
                    var w = img.width,
                        h = img.height;

                    resolve({
                        img: img,
                        area: {
                            x: area.x * w,
                            y: area.y * h,
                            w: area.w * w,
                            h: area.h * h
                        }
                    });
                }
                img.onerror = reject;
                img.src = url;
            });

        }
    }

})();
