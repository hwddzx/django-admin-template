(function() {
    angular.module('control-panes')
        .directive("tbEditRelease", tbEditRelease);

    function tbEditRelease(ReleaseService, $state) {

        return {
            scope: {
                release: "="
            },
            link: function(scope, element, attributes) {
                var backupDesc = "",
                    descTag = element.find("pre"),
                    actionTag = element.find("a").hide();

                var refreshDescTag = function (desc) {
                    if (desc) {
                        descTag.html(desc)
                    } else {
                        descTag.html("<span class='gray'>点击添加备注</span>");
                    }
                    descTag.removeClass("edit");
                    actionTag.hide();
                }

                refreshDescTag(scope.release.desc);

                descTag.on("click", function () {
                    if (descTag.children("span").length > 0) {
                        $(this).html("");
                    }
                    backupDesc = scope.release.desc;
                    $(this).addClass("edit");
                    actionTag.show();
                });

                element.on("click", ".sumbit", function () {
                    var html = descTag.html().replace(/<div>/g, "\n").replace(/<\/div>/g, "").replace(/<br>/g, "\n"),
                        model = {
                            desc: html
                        };
                    ReleaseService.updateRelease(scope.release.id, model).success(function (data) {
                        scope.release.desc = data.desc;
                        refreshDescTag(data.desc);
                    });
                })
                    .on("click", ".cancel", function () {
                        refreshDescTag(backupDesc);
                    });
            }
        }
    }
})();