(function() {
    angular.module('quail.main')
        .directive("tbSelectAll", tbSelectAll)
        .directive("tbSorting", tbSorting)
        .directive("tbResultText", tbResultText)
        .directive("tbSearch", tbSearch)
        .directive("tbDisabledInProduct", tbDisabledInProduct)
        .directive("tbIsSystem", tbIsSystem)
        .directive('tbLabHide', tbLabHide)
        .directive('tbLabShow', tbLabShow)
        .directive("tbAppsMenuScrollBar", tbAppsMenuScrollBar)
        .directive("tbFixButton", tbFixButton)
        .directive("tbInputFileMockClick", tbInputFileMockClick)
        .directive("imgError", imgError)
        .directive("imageOnLoad", imageOnLoad)
        .directive("tbCopy", tbCopy)
        .directive("ngEnter", ngEnter)
        .directive("scrollBar", scrollBar)
        .directive("scantaskLazyLoad", scantaskLazyLoad);

    function tbSelectAll(TaskService, $state, $timeout) {

        return {
            scope: {
                models: "="
            },
            link: function(scope, element, attributes) {
                $('.is-disabled').attr({ "disabled": "disabled" });
                scope.$watch("models", function(newVal, oldVal) {
                    var checkeds = _.filter(scope.models, { checked: true });
                    if (!checkeds.length) {
                        $('.is-disabled').attr({ "disabled": "disabled" });
                    } else {
                        $('.is-disabled').removeAttr("disabled");
                    }
                    if (checkeds.length !== scope.models.length) {
                        scope.models.allChecked = false;
                    }
                }, true);
                element.on("click", function() {
                    scope.$apply(function() {
                        _.forEach(scope.models, function(model) {
                            model.checked = scope.models.allChecked;
                        });
                    })
                });

                if (attributes.checked) {
                    $timeout(function() {
                        _.forEach(scope.models, function(model) {
                            model.checked = attributes.checked;
                        });
                    });
                }
            }
        }
    }

    function tbSorting() {
        return {
            restrict: 'A',
            compile: function(element, attributes) {
                return function(scope, element, attributes) {
                    var lastColumn;
                    element.find(".test-sorting").append('<i class="fa fa-sort sorting"></i>');
                    element.on("click", ".test-sorting", sort);

                    function sort() {
                        var orderBy,
                            secondOrder,
                            sortIcon;
                        if (this.attributes.orderBy) {
                            orderBy = this.attributes.orderBy.value;
                            secondOrder = this.attributes.secondOrder && this.attributes.secondOrder.value;
                            sortIcon = $(this).children('.sorting');
                        } else {
                            orderBy = this.parentElement.attributes.orderBy.value;
                            secondOrder = this.parentElement.attributes.secondOrder && this.parentElement.attributes.secondOrder.value;
                            sortIcon = $(this).closest('.sorting');
                        }

                        if (this != lastColumn) {
                            element.find('.sorting').removeClass("light fa-sort-up fa-sort-down");
                            sortIcon.addClass("light fa-sort-up");
                        };

                        sortIcon.toggleClass("fa-sort-down fa-sort-up");

                        lastColumn = this;

                        scope.$apply(function() {
                            if (secondOrder) {
                                scope.order = [orderBy, secondOrder]
                            } else {
                                scope.order = orderBy;
                            }
                            if (sortIcon.hasClass("fa-sort-up")) {
                                scope.direction = false;
                            } else {
                                scope.direction = true;
                            }
                        });
                    }
                }
            }
        }
    }

    function tbResultText() {
        return {
            restrict: 'A',
            compile: function(element, attributes) {
                return function(scope, element, attributes) {
                    var resultText = attributes.tbResultText;
                    if (resultText == "失败") {
                        element.addClass('red');
                    } else if (resultText == "通过") {
                        element.addClass('green');
                    }
                }
            }
        }
    }

    function tbSearch() {
        return {
            restrict: 'A',
            scope: {
                keywords: "="
            },
            compile: function(element, attributes) {
                return function(scope, element, attributes) {
                    element.append('<i class="click"></i>');
                    element.find('.click').addClass("click");
                    element.on("click", '.click', function() {
                        if (element.find('input.keyword').hasClass("search")) {
                            element.find('input.keyword')
                                .removeClass("search")
                                .addClass("search-click")
                                .focus();
                        } else {
                            element.find('input.keyword')
                                .removeClass("search-click")
                                .addClass("search");
                            scope.$apply(function() {
                                scope.keywords = "";
                            })
                        }
                    });
                }
            }
        }
    }

    function tbDisabledInProduct(config) {
        return {
            restrict: 'A',
            compile: function(element, attributes) {
                return function(scope, element, attributes) {
                    if (config.releaseEnv == "production") {
                        element.hide();
                    }
                }
            }
        }
    }

    function tbIsSystem(config) {
        return {
            restrict: 'A',
            compile: function(element, attributes) {
                return function(scope, element, attributes) {
                    if (!config.is_sys) {
                        element.hide();
                    }
                }
            }
        }
    }

    function tbLabHide(config) {
        return {
            restrict: 'MA',
            link: function(scope, element, attrs) {
                if (config.isLab()) {
                    element.hide();
                }
            }
        }
    }

    function tbLabShow(config) {
        return {
            restrict: 'MA',
            link: function(scope, element, attrs) {
                element[config.isLab() ? 'show' : 'hide']();
            }
        }
    }

    function tbAppsMenuScrollBar() {
        return {
            link: function(scope, element) {
                $(element).on("click", function(){
                    var top = 100,// 菜单距离浏览器顶部距离
                        menu = $(element).find(".apps-menu"),
                        menuHeight = menu.children("li").length * 50,// li height 50px
                        windowHeight = $(window).height();
                    if (menuHeight + top > windowHeight) {
                        menu.css({"width": "260px", "height": windowHeight - top + "px"});
                    } else {
                        menu.css({"width": "242px", "height": "auto"});
                    }
                });
            }
        }
    }

    function tbFixButton() {
        return {
            link: function(scope, element) {
                $(window).scroll(function() {
                    element.css({"top": 100 - window.pageYOffset});
                }).trigger('scroll');
            }
        }
    }

    function tbInputFileMockClick() {
        return {
            link: function(scope, element) {
                element.on("click", function() {
                    element.siblings("input[type=file]").click();
                });
            }
        }
    }

    function imageOnLoad() {
        return {
            restrict: 'A', link: function(scope, element, attrs) {
                element.on('load', function() {
                    scope.$apply(attrs.imageOnLoad);
                });
            }
        };
    }

    function imgError() {
        return {
            link: function (scope, element) {
                var errorImg = "assets/img/img-error.png",
                    $img = element.prop("tagName") === "IMG" ? element : element.find("img");

                $img.error(function() {
                    var $this = $(this);
                    if ($this.attr( "src") == errorImg) {
                        $this.attr( "alt", "图片加载失败");
                    } else if ($this.attr( "src").indexOf('_o.jpg') > -1 || $this.attr( "src").indexOf('.jpg') === -1) {
                        $this.attr( "src", errorImg);
                    } else {
                        $this.attr( "src", $this.attr( "src").replace('.jpg', '_o.jpg'));
                    }
                })
            }
        }
    }

    function tbCopy() {
        return {
            link: function(scope, element) {
                element.find('.js-copy-btn').click(function() {
                    element.find(".js-copy-text")[0].select();
                    document.execCommand('copy');
                })
            }
        }
    }

    function ngEnter() {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.bind("keydown keypress", function (event) {
                    if(event.which === 13) {
                        scope.$apply(function (){
                            scope.$eval(attrs.ngEnter);
                        });

                        event.preventDefault();
                    }
                });
            }
        }
    }

    function scrollBar() {
        return {
            restrict: 'A',
            scope:{
                target:'='
            },
            link: function (scope, element) {
                $(element).on("click", function(){
                    $(window).scrollTop($("#" + scope.target).offset().top);
                });
            }
        }
    }

    function scantaskLazyLoad(ScanService) {
        return {
            restrict: 'A',
            scope: {
                vm: '='
            },
            link: function(scope, element) {
                var LOAD_PAGE_SIZE = 100;

                ScanService.getScantasks().then(function(data) {
                    scope.vm.scantasks = data;
                    scope.vm.refresh();
                });

                //滚动时控制前后加载新日志
                element.scroll(function () {
                    var viewH = element.height(),//可见高度
                        contentH = element.get(0).scrollHeight,//内容高度
                        scrollTop = element.scrollTop();//滚动高度
                    if (scrollTop == 0 && scope.vm.taskFilter.begin > 0) {
                        scope.$apply(function () {
                            scope.vm.taskFilter.begin = _.max([scope.vm.taskFilter.begin - LOAD_PAGE_SIZE, 0]);
                            scope.vm.taskFilter.loadTotal += LOAD_PAGE_SIZE;
                        })
                    } else if (contentH - viewH <= scrollTop) {
                        //滚动到底部且未加载到最后一条日志则加载长度增加
                        scope.$apply(function () {
                            scope.vm.taskFilter.loadTotal += LOAD_PAGE_SIZE;
                        })
                    }
                })
            }
        }
    }
})();
