angular.module("stf.popover", [])
    .directive("tbPopover", function() {

        return {
            priority: 10000,
            link: function(scope, element, attr) {
                var $target,
                    targetId = attr.targetId;

                $("body").on("click", function($e) {
                    var $originTarget = $($e.target);
                    if (!$originTarget.closest("#" + targetId).length) {
                        getTarget().hide();
                    }
                })
                element.click(function($e) {
                    // 延迟处理
                    if (!$target) {
                        $target = getTarget();
                        if (element.prop("tagName").toLowerCase() == 'div') {
                            element.attr("tabindex", 0);
                        }
                        if ($target.prop("tagName").toLowerCase() == 'div') {
                            $target.attr("tabindex", 0);
                        }
                        $target.on("click", function($e) {
                            $e.stopPropagation();
                        });
                    }
                    $e.stopPropagation();
                    getTarget().toggle();
                });

                function getTarget() {
                    return $target || ($target = $("#" + targetId));
                }

            }
        };

    })
