(function() {
    angular.module('report_v2')
        .directive('tbComptestLogsSearch', tbComptestLogsSearch)
        .directive('switchSubtask', switchSubtask);

    function tbComptestLogsSearch(reportV2Service) {
        return {
            restrict: 'A',
            scope: {
                vm: '='
            },
            link: function(scope, element) {
                if ( scope.vm.subtaskDetail.all_log_url) {
                    var LOAD_PAGE_SIZE = 100,
                        TOP_MARING_LINE = 20,
                        searchLogsMarks,
                        $search = $('.search'),
                        $searchInput = $(".search-input", $search),
                        $hint = $(".hint", $search);

                    scope.$on('logs.directiveScrollToExceptionLog', function () {
                        $('body').animate({scrollTop: $('.width-full-screen').offset().top}, 300);
                        //滚动到0会触发加载前100项
                        element.animate({"scrollTop": 1})
                    });

                    //滚动时控制前后加载新日志
                    element.scroll(function() {
                        var viewH = element.height(),//可见高度
                            contentH = element.get(0).scrollHeight,//内容高度
                            scrollTop = element.scrollTop();//滚动高度
                        if (scrollTop == 0 && scope.vm.filter.begin > 0) {
                            scope.$apply(function() {
                                scope.vm.filter.begin = _.max([scope.vm.filter.begin - LOAD_PAGE_SIZE, 0]);
                                scope.vm.filter.loadTotal += LOAD_PAGE_SIZE;
                            })
                        } else if( (contentH - viewH <= scrollTop) && (scope.vm.filter.begin + scope.vm.filter.loadTotal < scope.vm.filtedLogs.length)) {
                            //滚动到底部且未加载到最后一条日志则加载长度增加
                            scope.$apply(function() {
                                scope.vm.filter.loadTotal += LOAD_PAGE_SIZE;
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
                                searchLogsMarks = reportV2Service.searchMiniLogs(scope.vm.searchText, scope.vm.filtedLogs, scope.vm.isCaseSensitive);
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
                                    var filter = scope.vm.filter;
                                    //搜索结果在当前已经加载日志后
                                    if (searchLogsMarks[currentMarkIndex].index > filter.begin + filter.loadTotal) {
                                        scope.$apply(function () {
                                            if (searchLogsMarks[currentMarkIndex].index > (filter.begin + filter.loadTotal + LOAD_PAGE_SIZE)) {
                                                scope.vm.filter.begin = _.max([searchLogsMarks[currentMarkIndex].index - TOP_MARING_LINE, 0]);
                                                scope.vm.filter.loadTotal = LOAD_PAGE_SIZE;
                                            } else {
                                                scope.vm.filter.loadTotal += LOAD_PAGE_SIZE;
                                            }
                                        })
                                    }
                                    //搜索结果在当前已经加载日志前
                                    if (searchLogsMarks[currentMarkIndex].index < filter.begin) {
                                        scope.$apply(function () {
                                            if (searchLogsMarks[currentMarkIndex].index < (filter.begin - LOAD_PAGE_SIZE)) {
                                                scope.vm.filter.begin = searchLogsMarks[currentMarkIndex].index - TOP_MARING_LINE;
                                                scope.vm.filter.loadTotal = LOAD_PAGE_SIZE;
                                            } else {
                                                scope.vm.filter.begin -= LOAD_PAGE_SIZE;
                                                scope.vm.filter.loadTotal += LOAD_PAGE_SIZE;
                                            }
                                            scope.vm.filter.begin = _.max([scope.vm.filter.begin, 0])
                                        })
                                    }

                                    //跳转到搜索行
                                    setTimeout(function () {
                                        $hint.text('第' + (currentMarkIndex + 1) + '条，共' + searchLogsMarks.length + '条');
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

    function switchSubtask($state, $location) {
        return {
            restrict: 'A',
            scope: {
                subtasks: '=',
                currentSubtaskKey: '=',
                detailDeviceModelName: '='
            },
            link: function(scope, element, attributes) {
                var subtasks = scope.subtasks,
                    currentSubtaskIndex = _.max([_.findIndex(subtasks, {'key': scope.currentSubtaskKey }), 0]);

                $('.select2-chosen', element).text(scope.detailDeviceModelName);
                if (currentSubtaskIndex == 0) {
                    $('.pre', element).addClass("disabled");
                } else {
                    $('.pre', element).click(function() {
                        $state.go("subtaskDetail.performance", {
                            subtaskKey: subtasks[--currentSubtaskIndex].key
                        });
                    })
                }
                if (currentSubtaskIndex == (subtasks.length - 1) || subtasks.length == 0) {
                    $('.next', element).addClass("disabled");
                } else {
                    $('.next', element).click(function() {
                        $state.go("subtaskDetail.performance", {
                            subtaskKey: subtasks[++currentSubtaskIndex].key
                        });
                    })
                }

                $(".select2", element).change(function(){
                    $state.go("subtaskDetail.performance", {
                        subtaskKey: scope.currentSubtaskKey
                    });
                });
            }
        }
    }
})();