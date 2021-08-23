(function() {

    angular.module("quail.image-box", [])
        .directive("tbImageBox", tbImageBox);

    function tbImageBox($compile, $templateRequest, DialogService, spinner) {

        return {
            link: function(scope, element, attrs) {
                var $imageBox, $backdrop, $imageWrap, $imageWrapInner,
                    imageMargin = attrs.imageMargin || 100,
                    offsetTop = attrs.offsetTop || 0,
                    zindex = attrs.zindex || 10,
                    templateUrl = attrs.boxTplUrl || "components/image-box/image.box.html";

                scope.close = closeImageBox;

                element.on("click", ".image-box-item", onImageClicked);

                function onImageClicked() {
                    $("body").addClass("modal-opened");
                    showImageBox($(this).attr("data-url") || $(this).attr("src"));
                }

                function showImageBox(url) {
                    var image = new Image(),
                        $image = $(image);

                    spinner.show();

                    image.onerror = function() {
                        spinner.hide();
                        DialogService.alert("图片加载错误!");
                    }

                    image.onload = function() {
                        var imageSize = getAdaptedImageSize(image);
                        scope.imageSize = imageSize;

                        getImageBoxTemplate().then(function($tpl) {
                            $imageBox = $tpl;
                            $imageBox.css("z-index", zindex);
                            $backdrop = $imageBox.find(".backdrop");
                            $imageWrap = $imageBox.find(".image-wrap");
                            $imageWrapInner = $imageBox.find(".image-wrap-inner");

                            $imageWrap.width(imageSize.width);
                            $imageWrap.height(imageSize.height);
                            $imageWrap.css("top", ($('body').height() - imageSize.height) / 2 - offsetTop);
                            $imageWrap.css("left", ($('body').width() - imageSize.width) / 2);
                            $image.css("max-width", imageSize.width + 'px');
                            $image.css("height", "auto");

                            spinner.hide();
                            $imageWrapInner.append($image);
                            $('body').append($imageBox);
                        });
                    }

                    image.src = url;
                }

                function closeImageBox() {
                    $imageBox.remove();
                    $("body").removeClass("modal-opened");
                }

                function getImageBoxTemplate() {
                    return $templateRequest(templateUrl).then(function(tpl) {
                        return $compile($(tpl))(scope);
                    });
                }

                function getAdaptedImageSize(image) {

                    var maxSize = {},
                        popupSize = {},
                        finalSize = {},
                        originSize = {
                            width: image.width,
                            height: image.height
                        };


                    popupSize.width = $('body').width();
                    popupSize.height = $('body').height();

                    maxSize = {
                        width: popupSize.width - 2 * imageMargin,
                        height: popupSize.height - 2 * imageMargin
                    }

                    //如果图片的原始尺寸小于窗口尺寸
                    if (originSize.width <= maxSize.width && originSize.height <= maxSize.height) {
                        finalSize = originSize;
                    } else {
                        //如果图片的原始尺寸大于窗口尺寸，则分别从x,y方向缩放，取缩放后的最小尺寸
                        var xScaledSize = null,
                            yScaledSize = null;
                        if (originSize.width >= maxSize.width) {
                            xScaledSize = {
                                width: maxSize.width,
                                height: originSize.height * (maxSize.width / originSize.width)
                            }
                        }
                        if (originSize.height >= maxSize.height) {
                            yScaledSize = {
                                height: maxSize.height,
                                width: originSize.width * (maxSize.height / originSize.height)
                            }
                        }
                        finalSize = xScaledSize || yScaledSize;
                        if (xScaledSize && yScaledSize) {
                            finalSize = xScaledSize.width > yScaledSize.width ? yScaledSize : xScaledSize;
                        }
                    }
                    if (scope.snapshot) {
                        scope.snapshot.originSize = originSize;
                        scope.snapshot.finalSize = finalSize;
                    }

                    return finalSize;
                }

            }
        }
    };


})();
