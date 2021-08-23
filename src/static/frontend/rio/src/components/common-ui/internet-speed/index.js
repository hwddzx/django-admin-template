angular.module("stf.internet-speed", [])
    .directive("internetSpeed", function() {

        return {
            link: function(scope, element, attr) {

                var imageAddr = "http://en.testbird.com/wp-content/uploads/2015/01/logo.png";
                var downloadSize = 3832; //bytes

                window.onload = function() {
                    element.html("testing internet speed...");
                    window.setTimeout(MeasureConnectionSpeed, 1);
                };

                //from http://stackoverflow.com/questions/5529718/how-to-detect-internet-speed-in-javascript
                function MeasureConnectionSpeed() {
                    var startTime, endTime;
                    var download = new Image();
                    download.onload = function() {
                        endTime = (new Date()).getTime();
                        showResults();
                    }

                    download.onerror = function(err, msg) {
                        console.log("Invalid image, or error downloading");
                    }

                    startTime = (new Date()).getTime();
                    var cacheBuster = "?nnn=" + startTime;
                    download.src = imageAddr + cacheBuster;

                    function showResults() {
                        var duration = (endTime - startTime) / 1000;
                        var bitsLoaded = downloadSize * 8;
                        var speedBps = (bitsLoaded / duration).toFixed(2);
                        var speedKbps = (speedBps / 1024).toFixed(2);
                        var speedMbps = (speedKbps / 1024).toFixed(2);

                        element.html("网速：" + speedMbps + "mbps");
                        if (speedMbps < 1) {
                            element.append(",为保证系统流畅,需要1mbps以上带宽，低于此值可能会有些卡顿");
                        }
                    }
                }

            }
        };

    })
