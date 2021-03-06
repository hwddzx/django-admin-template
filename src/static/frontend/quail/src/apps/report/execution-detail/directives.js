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
                //??????????????????30??????????????????????????????
                if (scope.imagesLength <= CHECKS_MAX_AMOUNT) {
                    return;
                }
                //??????????????? = ??????????????????????????????????????????(????????????????????????/????????????)????????????????????
                // ?????????????????? ????????????????????????????????38px???
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
                    //??????$scrollBar?????????????????????????????????????????????
                    iX = e.clientX - $(this).offset().left;
                    this.setCapture && this.setCapture();
                    $rollingGroove.addClass('move');
                });
                $(document).mousemove(function(e) {
                    if (dragging) {
                        var e = e || window.event,
                            //??????$scrollBar???????????????????????????????????????
                            // ???????????? = ?????????????????? - $rollingGroove?????????????????? - ???????????????$scrollBar?????????
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
                        //??????????????????????????????????????????????????????????????????????????????
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
                        //???????????????????????????diff??????
                        $comparesControl.addClass('visibility-hidden');
                        //????????????????????????????????????????????????diff??????
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

                        //??????$timeout????????????????????????????????????????????????
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
                        '<label>????????????</label>',
                        '<pre>' + testcase.pre_condition + '</pre>',
                        '<label>????????????</label>',
                        '<pre>' + testcase.desc + '</pre>',
                        '<label>????????????</label>',
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
                //?????????????????????244????????????190
                var width = scope.index == 1 ? 244 : 190;

                element[0].onload = function() {

                    //?????????????????????
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
                    //??????????????????90???
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
                    // ???????????????90??
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

                    //????????????????????????????????????
                    element.scroll(function() {
                        var viewH = element.height(),//????????????
                            contentH = element.get(0).scrollHeight,//????????????
                            scrollTop = element.scrollTop();//????????????
                        if (scrollTop == 0 && scope.vm.logFilter.begin > 0) {
                            scope.$apply(function() {
                                scope.vm.logFilter.begin = _.max([scope.vm.logFilter.begin - LOAD_PAGE_SIZE, 0]);
                                scope.vm.logFilter.loadTotal += LOAD_PAGE_SIZE;
                            })
                        } else if( (contentH - viewH <= scrollTop) && (scope.vm.logFilter.begin + scope.vm.logFilter.loadTotal < scope.vm.filtedLogs.length)) {
                            //?????????????????????????????????????????????????????????????????????
                            scope.$apply(function() {
                                scope.vm.logFilter.loadTotal += LOAD_PAGE_SIZE;
                            })
                        }
                    })

                    //???????????????
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
                            //????????????13
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
                                    //??????????????????????????????????????????
                                    if (searchLogsMarks[currentMarkIndex].index > filter.begin + filter.loadTotal) {
                                        scope.$apply(function () {
                                            if (searchLogsMarks[currentMarkIndex].index > (filter.begin + filter.loadTotal + LOAD_PAGE_SIZE)) {
                                                scope.vm.logFilter.begin = _.min([searchLogsMarks[currentMarkIndex].index - TOP_MARING_LINE, scope.vm.filtedLogs.length - LOAD_PAGE_SIZE]);
                                                //?????????????????????????????????????????????????????????
                                                scope.vm.logFilter.begin = _.max([scope.vm.logFilter.begin, 0])
                                                scope.vm.logFilter.loadTotal = LOAD_PAGE_SIZE;
                                            } else {
                                                scope.vm.logFilter.loadTotal += LOAD_PAGE_SIZE;
                                            }
                                        })
                                    }
                                    //??????????????????????????????????????????
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

                                    //??????????????????
                                    setTimeout(function () {
                                        $hint.text((currentMarkIndex + 1) +'/'+ searchLogsMarks.length + '???');
                                        $('.current-light', element).removeClass('current-light');

                                        // ????????????????????????????????????
                                        var scrollTop = $('.logs-index-' + searchLogsMarks[currentMarkIndex].logIndex, element)
                                                .addClass('current-light')
                                                .offset().top
                                            - $("li", element).first().offset().top;

                                        //??????50??????
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

