(function() {
    angular.module('quail.report')
        .directive("tbReplaySlider", tbReplaySlider)
        .directive("tbShowDiff", tbShowDiff)
        .directive("tbShowCaseDetail", tbShowCaseDetail)
        .directive("quailRotateImage", quailRotateImage)
        .directive("quailRotateImage2", quailRotateImage2)
        .directive("tbLogsSearch", tbLogsSearch)
        .directive("replayLayoutTree", replayLayoutTree);

    function replayLayoutTree() {
        return {
            scope: {
                xml:"="
            },
            link: function(scope, element) {
                var x2js = new X2JS({
                        attributePrefix: "_", arrayAccessFormPaths: [/.*./]
                    }),
                    setting = {
                        view: {
                            selectedMulti: false,
                            nameIsHTML: true,
                            showIcon: false,
                            showLine: false,
                            fontCss: {
                                "font-size": "14px",
                                "color": "#333"
                            }
                        },
                        data: {
                            key: {
                                name: "name",
                                children: "node"
                            }
                        },
                        callback: {
                            onClick: _onClick
                        }
                    },
                    hierarchy,
                    tree;

                init();

                function init() {

                    hierarchy = x2js.xml_str2json(scope.xml);

                    var nodes = hierarchy.hierarchy.node;

                    if (_.isEmpty(nodes)) {
                        scope.$apply(function() {
                            scope.xml = null
                        })
                        return;
                    }

                    _reconfigure(nodes);

                    tree = $.fn.zTree.init(element, setting, nodes);
                    tree.expandAll(true);
                }

                function _onClick(event, id, node) {
                    scope.$apply(function() {
                        scope.$emit('node.afterClick', node);
                        scope.$emit('create.xmlLayout', hierarchy.hierarchy._bounds);
                    })
                }

                function _reconfigure(nodes) {
                    if (_.isEmpty(nodes)) return;
                    var temp = undefined,
                        text = undefined;
                    for (var i = 0, l = nodes.length; i < l; i++) {
                        temp = nodes[i];
                        if (_.isEmpty(temp["_text"])) {
                            temp.name = temp["_class"];
                        } else {
                            text = temp["_text"];
                            temp.name = temp["_class"] + " (" + (text.length > 10 ? text.substr(0, 10) + "..." : text) + ")";
                        }
                        _reconfigure(temp["node"]);
                    }
                }
            }
        }
    }

    function tbReplaySlider() {
        return {
            restrict: 'A',
            scope: {
                imagesLength: '@'
            },
            link: function(scope, element, attributes) {
                var PAGE_WIDTH = 1120,
                    CHECKS_MAX_AMOUNT = 30;
                //截图数量小于30个时不需要添加滑动条
                if (scope.imagesLength <= CHECKS_MAX_AMOUNT) {
                    return;
                }
                //滚动条长度 = 当前窗口所占按钮总长度百分比(即：当前窗口长度/按钮长度)×当前窗口长度
                // 按钮总长度： 按钮数×每个按钮宽度（38px）
                var scrollBarWidth = PAGE_WIDTH / (scope.imagesLength * 38) * PAGE_WIDTH,
                    $scrollBar = element.find(".scroll-bar"),
                    $rollingGroove = element.find(".rolling-groove"),
                    dragging = false,
                    iX;

                scope.$watch("imagesLength", function(newVal, oldVal) {
                    if (scope.imagesLength <= CHECKS_MAX_AMOUNT) {
                        $scrollBar.hide();
                        $rollingGroove.hide();
                    } else {
                        $scrollBar.show();
                        $rollingGroove.show();
                        scrollBarWidth = PAGE_WIDTH / (scope.imagesLength * 38) * PAGE_WIDTH;
                    }
                });

                $rollingGroove.show();
                $scrollBar.width(scrollBarWidth).mousedown(function(e) {
                    dragging = true;
                    //点击$scrollBar时获取点击部位距离元素左部距离
                    iX = e.clientX - $(this).offset().left;
                    this.setCapture && this.setCapture();
                    $rollingGroove.addClass('move');
                });
                $(document).mousemove(function(e) {
                    if (dragging) {
                        var e = e || window.event,
                            //点击$scrollBar后拖动时获取鼠标拖动距离：
                            // 拖动距离 = 当前鼠标位置 - $rollingGroove与窗口左间距 - 拖动起点距$scrollBar左间距
                            oX = e.clientX - $rollingGroove.offset().left - iX;
                        if (oX < 0) {
                            oX = 0;
                        } else if (oX > (PAGE_WIDTH - scrollBarWidth)) {
                            oX = PAGE_WIDTH - scrollBarWidth;
                        }
                        $scrollBar.css({ "left": oX + "px" });
                        element.find(".replay-list").css({ "left": -oX * PAGE_WIDTH / scrollBarWidth + "px" });
                    }
                }).mouseup(function(e) {
                    dragging = false;
                    $rollingGroove.removeClass('move');
                })
            }
        }
    }

    function tbShowDiff($timeout) {
        return {
            restrict: 'A',
            scope: {
                images: '=',
                currentNumber: '=',
                showDiff: '=',
                areaEnabled: '='
            },
            link: function(scope, element, attributes) {
                scope.$watch("images", function() {
                    _showDiff();
                }, true)
                scope.$watch("currentNumber", function(newVal, oldVal) {
                    _showDiff();
                    if (scope.images.length) {
                        if (scope.currentNumber <= 0) {
                            scope.currentNumber = 1;
                        }
                        scope.currentNumber = Math.min(scope.currentNumber, scope.images.length);
                    }
                    $timeout(function() {
                        //当前查看图片为第一张时，没有前一张图，该区域保留空白
                        if (newVal == 1) {
                            element.find(".single-snapshot:nth-child(1)").addClass('visibility-hidden');
                        }
                    })
                });
                scope.$watch("showDiff", function(newVal, oldVal) {
                    _showDiff();
                });

                function _showDiff() {
                    var $showCompare = $("input[name=showCompare]"),
                        $comparesControl = $(".report-detail-container .replay-task .compares-control");
                    if (scope.images[scope.currentNumber - 1].state == 'pass') {
                        //切换到绿色图片隐藏diff按钮
                        $comparesControl.addClass('visibility-hidden');
                        //避免切换到绿色图片时展示不存在的diff图片
                        $timeout(function() {
                            if (scope.showDiff) {
                                scope.$apply(function() {
                                    scope.showDiff = false;
                                })
                            }
                        })
                    } else {
                        $comparesControl.removeClass('visibility-hidden');
                    }
                    $timeout(function() {
                        var $currentImage = element.find(".single-snapshot:nth-child(2)");
                        element.children().removeClass("image-box-item");

                        //移动$timeout内部，避免时间延迟导致的界面闪烁
                        element.find(".show-base").removeClass('show-base');
                        element.find(".show-diff").removeClass('show-diff');

                        if ($currentImage.hasClass("valid-baseline") && scope.areaEnabled) {
                            $currentImage.addClass("image-box-item");
                        }
                        if (scope.showDiff) {
                            $currentImage.addClass("show-diff");
                        } else {
                            $currentImage.addClass("show-base");
                        }
                    })
                }
            }
        }
    }

    function tbShowCaseDetail() {
        return {
            restrict: 'A',
            scope: {
                testcase: '=',
            },
            link: function(scope, element) {
                var testcase = scope.testcase;
                if (testcase) {
                    element.append([
                        '<div class="prompt-container">',
                        '<i class="icon icon-prompt"></i>',
                        '<div class="prompt-text">',
                        '<label>前置条件</label>',
                        '<pre>' + testcase.pre_condition + '</pre>',
                        '<label>测试步骤</label>',
                        '<pre>' + testcase.desc + '</pre>',
                        '<label>期望结果</label>',
                        '<pre>' + testcase.expect_result + '</pre>',
                        '<div class="arrow-border"></div> <div class="arrow-bg"></div>',
                        '</div>'

                    ].join(''));
                    element.find('.prompt-container').hover(function() {
                        $(this).find('.prompt-text').stop().fadeIn();
                    }, function() {
                        $(this).find('.prompt-text').stop().fadeOut();
                    })
                }
            }
        }

    }



    function quailRotateImage($timeout) {

        return {
            restrict: 'A',
            scope: {
                index: '=',
                currentNumber: "="
            },
            link: function(scope, element, attrs) {
                //居中图片宽度为244，两边为190
                var width = scope.index == 1 ? 244 : 190;

                element[0].onload = function() {

                    //竖屏图片不转换
                    if (this.width <= this.height) {
                        return
                    }

                    _rotateImage();
                    scope.$watch('currentNumber', function() {
                        $timeout(function() {
                            width = scope.index == 1 ? 244 : 190;
                            _rotateImage();
                        })
                    })
                    //横屏图片旋转90度
                    function _rotateImage() {
                        if ( !element.hasClass('rotated-adaptive-image')) {
                            element.addClass('rotated-adaptive-image');
                        }
                        element.css({
                            'height': width + 'px',
                            'width': 'auto'
                        });
                    }
                }
            }
        }
    }

    function quailRotateImage2() {
        return {
            scope: {width: "=", height: "="},
            link: function(scope, element) {
                var width = scope.width || 120,
                    height = scope.height || 210;
                element.on("load", function() {
                    // 横屏图片转90°
                    var $this = $(this);
                    if ($this.width() > $this.height()) {
                        $this.addClass("image-rotate-90")
                            .width(height)
                            .height(width);

                    }
                });
            }
        }
    }

    function tbLogsSearch(ExecutionDetailService, $timeout) {
        return {
            restrict: 'A',
            scope: {
                vm: '='
            },
            link: function(scope, element) {
                if ( scope.vm.executionDetail.run_log_url) {
                    var LOAD_PAGE_SIZE = 100,
                        TOP_MARING_LINE = 20,
                        searchLogsMarks,
                        $search = $('.search'),
                        $searchInput = $(".search-input", $search),
                        $hint = $(".hint", $search),
                        os = '';
                    if(scope.vm.executionDetail.device.os.indexOf('ios')>-1){
                        os = "ios"
                    }
                    ExecutionDetailService.getMiniLogs(scope.vm.executionDetail.run_log_url, os).then(function(data) {
                        scope.vm.logs = data;
                        $timeout(function () {scope.$digest()},20)
                        scope.vm.refresh();
                    });

                    //滚动时控制前后加载新日志
                    element.scroll(function() {
                        var viewH = element.height(),//可见高度
                            contentH = element.get(0).scrollHeight,//内容高度
                            scrollTop = element.scrollTop();//滚动高度
                        if (scrollTop == 0 && scope.vm.logFilter.begin > 0) {
                            scope.$apply(function() {
                                scope.vm.logFilter.begin = _.max([scope.vm.logFilter.begin - LOAD_PAGE_SIZE, 0]);
                                scope.vm.logFilter.loadTotal += LOAD_PAGE_SIZE;
                            })
                        } else if( (contentH - viewH <= scrollTop) && (scope.vm.logFilter.begin + scope.vm.logFilter.loadTotal < scope.vm.filtedLogs.length)) {
                            //滚动到底部且未加载到最后一条日志则加载长度增加
                            scope.$apply(function() {
                                scope.vm.logFilter.loadTotal += LOAD_PAGE_SIZE;
                            })
                        }
                    })

                    //搜索框功能
                    $searchInput
                        .focus(function() {
                            scope.$apply(function() {
                                scope.vm.showSearchControlled = false;
                                scope.vm.searchError = false;
                            })
                        })
                        .blur(function() {
                            scope.$apply(function() {
                                if (searchLogsMarks && searchLogsMarks.length) {
                                    scope.vm.showSearchControlled = true;
                                    scope.vm.searchError = false;
                                }
                                if (searchLogsMarks && !searchLogsMarks.length) {
                                    scope.vm.showSearchControlled = false;
                                    scope.vm.searchError = true;
                                }
                            })
                        })
                        .keydown(function(event) {
                            //回车键值13
                            var VK_RETURN = 13;
                            if (event.which == VK_RETURN) {
                                $search.off('click');
                                var currentMarkIndex = 0;
                                searchLogsMarks = ExecutionDetailService.searchMiniLogs(scope.vm.searchText, scope.vm.filtedLogs, scope.vm.isCaseSensitive);
                                $searchInput.blur();
                                if (searchLogsMarks && !searchLogsMarks.length) {
                                    return
                                }

                                _scrollToResultLine();
                                $search.on('click', '.direction-up', function () {
                                    currentMarkIndex--;
                                    if (currentMarkIndex < 0) {
                                        currentMarkIndex = searchLogsMarks.length - 1;
                                    }
                                    _scrollToResultLine();
                                })
                                $search.on('click', '.direction-down', function () {
                                    currentMarkIndex++;
                                    if (currentMarkIndex >= searchLogsMarks.length) {
                                        currentMarkIndex = 0;
                                    }
                                    _scrollToResultLine();
                                })

                                function _scrollToResultLine() {
                                    var filter = scope.vm.logFilter;
                                    //搜索结果在当前已经加载日志后
                                    if (searchLogsMarks[currentMarkIndex].index > filter.begin + filter.loadTotal) {
                                        scope.$apply(function () {
                                            if (searchLogsMarks[currentMarkIndex].index > (filter.begin + filter.loadTotal + LOAD_PAGE_SIZE)) {
                                                scope.vm.logFilter.begin = _.min([searchLogsMarks[currentMarkIndex].index - TOP_MARING_LINE, scope.vm.filtedLogs.length - LOAD_PAGE_SIZE]);
                                                //搜索结果在最后一百条内，加载最后一百条
                                                scope.vm.logFilter.begin = _.max([scope.vm.logFilter.begin, 0])
                                                scope.vm.logFilter.loadTotal = LOAD_PAGE_SIZE;
                                            } else {
                                                scope.vm.logFilter.loadTotal += LOAD_PAGE_SIZE;
                                            }
                                        })
                                    }
                                    //搜索结果在当前已经加载日志前
                                    if (searchLogsMarks[currentMarkIndex].index < filter.begin) {
                                        scope.$apply(function () {
                                            if (searchLogsMarks[currentMarkIndex].index < (filter.begin - LOAD_PAGE_SIZE)) {
                                                scope.vm.logFilter.begin = searchLogsMarks[currentMarkIndex].index - TOP_MARING_LINE;
                                                scope.vm.logFilter.loadTotal = LOAD_PAGE_SIZE;
                                            } else {
                                                scope.vm.logFilter.begin -= LOAD_PAGE_SIZE;
                                                scope.vm.logFilter.loadTotal += LOAD_PAGE_SIZE;
                                            }
                                            scope.vm.logFilter.begin = _.max([scope.vm.logFilter.begin, 0])
                                        })
                                    }

                                    //跳转到搜索行
                                    setTimeout(function () {
                                        $hint.text((currentMarkIndex + 1) +'/'+ searchLogsMarks.length + '条');
                                        $('.current-light', element).removeClass('current-light');

                                        // 搜索结果到第一条日志距离
                                        var scrollTop = $('.logs-index-' + searchLogsMarks[currentMarkIndex].logIndex, element)
                                                .addClass('current-light')
                                                .offset().top
                                            - $("li", element).first().offset().top;

                                        //预留50高度
                                        scrollTop -= 50;

                                        element.stop().animate({
                                            "scrollTop": scrollTop
                                        })
                                    })
                                }
                            }
                        })
                }
            }
        }
    }
})();

