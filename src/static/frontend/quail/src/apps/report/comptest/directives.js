(function() {
    angular.module('report_v2')
        //        .directive('tbDetailTitle', tbDetailTitle)
        //        .directive('tbSceneIndicator', tbSceneIndicator)
        //        .directive('tbExceptionCount', tbExceptionCount)
        .directive('tbWordHelpV2', tbWordHelp)
//        .directive('tbAngleUpDown', tbAngleUpDown)
        .directive('tbRentSure', tbRentSure)
//        .directive('tbFixTableHead', tbFixTableHead)
        .directive('tbChangeAppType', tbChangeAppType)
//        .directive('tbViewDetails', tbViewDetails)
//        .directive('tbTextCenter', tbTextCenter)
//        .directive('imageLazyLoad', imageLazyLoad)
        .directive('exceptionLogChart', exceptionLogChart)
        .directive('tbLoadMore', tbLoadMore)
        .directive('panelSwitch', panelSwitch)
        .directive('subtaskPerformanceChart', subtaskPerformanceChart)
        .directive('scrollToBottomLazyLoad', scrollToBottomLazyLoad)
        .directive('showCollapseBtnIfNeed', showCollapseBtnIfNeed)
        .directive('panelSwitchLogs', panelSwitchLogs)
        .directive('pgyerHide', pgyerHide);

    function tbDetailTitle($state) {
        return {
            restrict: 'A',
            scope: {
                ctrl: "="
            },
            link: function(scope, element, attributes) {

                //根据条件处理横条显示状态
                setTimeout(function() {

                    var currentIndex = 0,
                        exceptionIndex = 0,
                        scenes = scope.ctrl.scenes,
                        isSysException = scope.ctrl.sceneModel.isSysException,
                        exceptionScene = scope.ctrl.sceneModel.exceptionScene,
                        warningScenes = scope.ctrl.sceneModel.warningScenes,
                        currentScene = scope.ctrl.sceneModel.currentScene,
                        defaultScene = currentScene || exceptionScene || _.keys(warningScenes)[0] || scenes[0];

                    currentIndex = scenes.indexOf(defaultScene);

                    if (defaultScene == exceptionScene) {
                        _setIssueState("underline-exception");
                    } else if (defaultScene in warningScenes) {
                        _setIssueState("underline-warning");
                    } else {
                        _setIssueState("underline-normal");
                    };

                    function _setIssueState(className) {
                        $(".issues-state thead td:nth-child(" + (currentIndex + 1) + ")").addClass(className);
                    }

                    _.each(_.keys(warningScenes), function(scene, index) {
                        var warningIndex = scenes.indexOf(exceptionScene);
                        $(".issues-state tbody td:nth-child(" + (warningIndex + 1) + ")").addClass("state-warning");
                    });

                    exceptionIndex = scenes.indexOf(exceptionScene);

                    if (exceptionIndex != -1) {
                        $(".issues-state tbody td:nth-child(" + (exceptionIndex + 1) + ")").find(".state").removeClass("state-warning").addClass("state-exception");
                        if (isSysException) {
                            for (exceptionIndex; exceptionIndex < scenes.length; exceptionIndex++) {
                                $(".issues-state thead td:nth-child(" + (exceptionIndex + 2) + ")").addClass("underline-untested");
                                $(".issues-state tbody td:nth-child(" + (exceptionIndex + 2) + ")").find(".state").removeClass("state-warning").addClass("state-untested");
                            }
                        }
                    };

                    $(".issues-state tbody td:nth-child(" + (currentIndex + 1) + ")").find(".state").removeClass("state");

                    element.on("click", "td", function(e) {
                        if (!$(this).hasClass('underline-untested')) {
                            var selectedIndex = $(this).index(),
                                selectedScene = scope.ctrl.scenes[selectedIndex];

                            $state.go(".", {
                                'deviceKey': scope.ctrl.deviceKey,
                                'currentScene': selectedScene
                            }, {
                                reload: true
                            });
                        };
                    })

                })

            }
        };
    }

    function tbSceneIndicator($state) {
        return {
            restrict: 'A',
            scope: {
                device: "=",
                scene: "="
            },
            link: function(scope, element, attributes) {

                _refreshList();

                scope.$on("reFreshList", _refreshList);

                function _refreshList() {
                    setTimeout(function() {

                        element.removeClass("state-warning").removeClass("state-exception").removeClass("state-untested");

                        var warningScenes = scope.device.warning_scenes,
                            exceptionScene = scope.device.exception_scene,
                            scene = scope.scene.value,
                            isSysException = (exceptionScene && (scope.device.exception_image_url == null));

                        if (scene == exceptionScene) {
                            element.addClass("state-exception");
                        } else if (scene in warningScenes) {
                            element.addClass("state-warning");
                        };

                        if (isSysException) {
                            element.parents("tr").find(".state-exception").each(function() {
                                $(this).parents("td").nextAll().each(function() {
                                    $(this).find(".state").removeClass("state-warning").addClass("state-untested");
                                })
                            })
                        }

                        if (!element.hasClass("state-untested")) {
                            element.off("click").on("click", function(e) {
                                $state.go(".detail", {
                                    'deviceKey': scope.device.key,
                                    'currentScene': scope.scene.value
                                });
                            })
                        }
                    });
                }

                element.parents("td").on("mouseenter", function(e) {
                    var index = $(this).index();
                    setTimeout(function() {
                        $(".issues-state tbody td:nth-child(" + (index + 1) + ")").addClass("hover-active");
                    })
                })
                element.parents("td").on("mouseleave", function(e) {
                    setTimeout(function() {
                        $(".issues-state td").removeClass("hover-active");
                    });
                })
            }
        };

    }

    function tbExceptionCount() {
        return {
            restrict: 'A',
            scope: {
                device: "="
            },
            link: function(scope, element, attributes) {

                _reCount();

                scope.$on("reFreshList", _reCount)

                function _reCount() {
                    setTimeout(function() {
                        var device = scope.device,
                            issueCount = 0;

                        _.each(device.warning_scenes, function(scene, index, list) {
                            issueCount += scene.length
                        })

                        if (device.exception_scene) {
                            issueCount++
                        };

                        element.html(issueCount);
                    })

                }


            }
        };
    }

    function tbWordHelp() {
        return {
            restrict: 'A',
            scope: {
                helpText: "="
            },
            link: function(scope, element, attributes) {
                element.on("mouseenter", function(e) {
                    element.append("<span class='help-prompt'><i class='word-help-icon'></i></span>");
                });
                element.on("click", function(e) {
                    var title = attributes.tbWordHelpV2,
                        helpText = scope.helpText;

                    if (title == "totalNumberOfProblems") {
                        element.before("<div class='word-help-right'><p> " + helpText[title] + "</p></div>");
                        $(".word-help-right")
                            .css({
                                "bottom": 60,
                                "right": 0
                            })
                            .hide()
                            .fadeIn();
                    } else {
                        element.before("<div class='word-help'><p> " + helpText[title] + "</p></div>");
                        $(".word-help")
                            .css({
                                "bottom": 40,
                                "left": 0
                            })
                            .hide()
                            .fadeIn();
                    }
                });
                element.on("mouseleave", function(e) {
                    $(".word-help")
                        .fadeOut()
                        .remove();
                    $(".word-help-right")
                        .fadeOut()
                        .remove();
                    $(".help-prompt").remove();
                })
            }
        }
    }

    function tbAngleUpDown() {
        return {
            restrict: 'A',
            link: function(scope, element, attributes) {
                element.on("click", function(e) {
                    element.find(".angle").toggleClass("fa-angle-down fa-angle-up");
                });
            }
        }
    }

    function tbRentSure(config, reportV2Service) {
        return {
            restrict: 'A',
            scope: {
                subtaskId: "="
            },
            link: function (scope, element, attributes) {
                element.click(function () {
                    if (!config.rioEnabled) {
                        return;
                    }
                    var newWindow = window.open("");
                    reportV2Service.rentDevice(scope.subtaskId).then(function (res) {
                        newWindow.location.href = res.data.url;
                    }, function () {
                        newWindow.close();
                    });
                })

            }
        };
    }

    function tbChangeAppType(config) {
        return {
            restrict: 'C',
            compile: function(element, attributes) {
                return function(scope, element, attributes) {

                    changeAppType();

                    function changeAppType() {
                        setTimeout(function() {
                            if (!config.isGame) {
                                $(".tb-change-app-type").each(
                                    function() {
                                        var appText = $(this).text()
                                            .replace(/游戏玩家/g, "用户")
                                            .replace(/手游|游戏/g, "应用")
                                            .replace(/玩家/g, "用户")
                                            .replace(/gamer|player/g, "client")
                                            .replace(/mobile game|game/g, "application")
                                            .replace(/Game/g, "Application")
                                            .replace(/Run time/g, "Running");
                                        $(this).text(appText);
                                    }
                                )
                            }
                        })
                    }
                }
            }
        };
    }

    function tbViewDetails($stateParams, $uibModal, reportService, $translate) {
        return {
            restrict: 'A',
            compile: function(element, attributes) {
                //卡顿卡死是两个分类，根据key值判断
                var blockedStopKey = "f0a32464e950b8cea252b7b40ff3bab11a63fef1",
                    blockedDeathKey = "9bdde4174bd891af1263839846beb053aedbbae1";
                return function(scope, element, attributes) {
                    element.on("click", ".clickable", viewDetails);

                    function viewDetails(event) {
                        var key = $(event.currentTarget).attr("issue-key"),
                            exception = {};
                        exception.list = [];
                        reportService.getDevices($stateParams.key).then(function(res) {
                            //卡顿&卡死后端数据是两项需要合并比较
                            if (key === $translate.instant('卡顿&卡死')) {
                                exception.name = key;
                                _.each(res.data.exception_list, function(value) {
                                    if (value.result_subtype_json[0].key === blockedStopKey || value.result_subtype_json[0].key === blockedDeathKey) {
                                        exception.list.push(value);
                                    }
                                });
                            } else {
                                _.each(res.data.exception_list, function(value) {
                                    if (value.result_subtype_json[0].key === key) {
                                        exception.list.push(value);
                                        exception.name = value.result_subtype_text[0];
                                    }
                                });
                            }
                        });
                        $uibModal.open({
                            templateUrl: 'apps/report/compatibility/locate.html',
                            controller: 'locateController',
                            controllerAs: "vm",
                            size: "lg",
                            resolve: {
                                exception: function() {
                                    return exception
                                }
                            }
                        });
                    }
                }
            }
        };
    }

    function tbFixTableHead() {
        return {
            restrict: 'A',
            compile: function(element, attributes) {
                return function(scope, element, attributes) {
                    //参考 http://www.w3cfuns.com/article-5601025-1-1.html
                    var firstHeadWidth,
                        installHeadsWidth,
                        headsWidth;

                    $(window).scroll(function() {
                        if (document.getElementById("header-first")) {
                            var startPos = element.offset().top,
                                p = $(window).scrollTop();

                            if (p > startPos - 60) {
                                element.find("tr").addClass("fixed");
                                $('.headers').width(headsWidth);
                                $('.header0').width(installHeadsWidth);
                                // $('#header-first').width(firstHeadWidth);
                            } else {
                                element.find("tr").removeClass("fixed");
                            }

                            // firstHeadWidth = $('#header-first').width();
                            installHeadsWidth = $('.header0').width();
                            headsWidth = $('.header1').width();

                        };
                    });
                }
            }
        };
    }

    function tbTextCenter() {
        return {
            restrict: 'A',
            compile: function(element, attributes) {
                return function(scope, element, attributes) {
                    setTimeout(function() {
                        var height = element.find(".selection-head")[0].offsetHeight;
                        element.find("ul").css({
                            'lineHeight': height + 'px'
                        });
                    })
                }
            }
        };
    }

    function imageLazyLoad() {
        return {
            restrict: 'A',
            scope: {url: "="},
            link: function(scope, element) {
                // setTimeout 200ms,因为加载图片是在弹框,弹框有个150ms的动画,jquery.lazy要根据显示图片容器的位置来实现懒加载,所以要等弹窗显示之后再调用lazyLoad
                setTimeout(function() {
                    element.attr("data-original", scope.url + "?imageView2/2/w/200/h/200").lazyload({
                        container: $(".images-container"),
                        effect: "fadeIn"
                    });
                }, 200)
            }
        }
    }

    function exceptionLogChart($timeout) {
        return {
            restrict: 'A',
            scope:{
                ctrl: "="
            },
            link: function(scope, element, attributes) {

                var filteredSubtasks =  _.filter(scope.ctrl.subtasks, function(o) { return o.exception_desc != '' ; }),
                    all = {
                        name: 'all',
                        count: filteredSubtasks.length,
                        rate: 100,
                        coverage: _.sumBy(filteredSubtasks, 'device_model.coverage')
                    },
                    groupedSubtasks = _.chain(filteredSubtasks)
                        .groupBy('exception_desc')
                        .map(function(subtasks, exceptionDesc) {
                            return {
                                name: exceptionDesc,
                                count: subtasks.length,
                                rate: Math.round(subtasks.length / all.count * 1000) / 10,
                                coverage: _.sumBy(subtasks, 'device_model.coverage')
                            }
                        })
                        .value();

                var topFive = _.chain(groupedSubtasks).orderBy(['count', 'coverage'], ['desc', 'desc']).slice(0, 5).value();

                var others = {
                    name: 'others',
                    count: all.count - _.sumBy(topFive, 'count'),
                    rate: '',
                    coverage: all.coverage - _.sumBy(topFive, 'coverage')
                }
                others.rate = Math.round(others.count / all.count * 1000) / 10;

                //对表格数据初始化只显示topFive，若有更多数据则
                var $loadMore = $("<div class='tb-load-more'><a class='btn btn-xs'>加载更多</a></div>");
                element.next().after($loadMore);
                scope.ctrl.exceptionLists = topFive;
                if (others.count) {
                    $loadMore.show();
                }
                $loadMore.children("a").click(function() {
                    $loadMore.hide();
                    scope.$apply(function() {
                         scope.ctrl.exceptionLists = groupedSubtasks;
                    });
                });

                //按照highcharts作数据处理， 初始化显示highchartsData[0]数据
                var highchartsData = _.map(topFive, function(list) {
                    return {
                        name: list.name,
                        y: list.count
                    }
                })
                if (others.count) {
                    highchartsData.push({
                        name: '其他',
                        y: others.count
                    })
                }

                if (!highchartsData.length) {
                    return;
                }

                var highchart;
                element.highcharts({
                    chart: {
                        type: 'pie',
                        spacingRight: 920,
                        height: 300
                    },
                    colors: ["#fa575f", "#ff7e00", "#fdC42c", "#fee080", "#ffebaa", "#9db4ff"],
                    legend: {
                        align: 'right',
                        verticalAlign: 'middle',
                        layout: 'horizontal',
                        itemWidth: 400,
                        itemMarginBottom: 20,
                        width: 800,
                        floating: true,
                        x: 900,
                        symbolWidth: 16,
                        symbolHeight: 12,
                        itemStyle: {
                            width: '340px',
                            color: 'inherit',
                            fontWeight: 'normal',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'

                        },
                        itemHiddenStyle: {
                            color: '#8e9194',
                            fill: '#8e9194'
                        }
                    },
                    title: {
                        text: '<span class="amount-count">' +  _.sumBy(highchartsData, 'y') +  '台</span>' +
                        '<span class="current-count">0台</span>',
                        verticalAlign: 'middle',
                        y: 0,
                        useHTML: true
                    },
                    plotOptions: {
                        pie: {
                            innerSize: 110,
                            marker: {
                                states: {
                                    hover: false
                                }
                            },
                            allowPointSelect: true,
                            cursor: 'pointer',
                            dataLabels: {
                                enabled: false
                            },
                            showInLegend: true
                        },
                        series: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            point: {
                                events: {
                                    click: function() {
                                        var current = this;
                                        $timeout(function() {
                                            if (current.sliced) {
                                                $('.amount-count', element).hide();
                                                $('.current-count', element)
                                                    .text(current.y + '台')
                                                    .show();
                                            } else {
                                                $('.amount-count', element).show();
                                                $('.current-count', element).hide();
                                            }
                                        })
                                    },
                                    legendItemClick: function () {
                                        $timeout(function() {
                                            $('.amount-count', element).text(
                                                _.chain(highchart.series[0].data)
                                                    .filter('visible')
                                                    .sumBy('y')
                                                    .value()
                                                + '台'
                                            )
                                        })
                                    }
                                }
                            }
                        }
                    },
                    tooltip: {
                        enabled: false
                    },
                    credits: {
                        enabled: false
                    },
                    exporting: {
                        enabled: false
                    },
                    series: [{
                        type: 'pie',
                        name: 'Browser share',
                        data: highchartsData
                    }]
                }, function(chart) {
                    highchart = chart;
                });
            }
        }
    }

    function subtaskPerformanceChart($filter) {
        return {
            link: function(scope, element) {

                scope.$watch("vm.yAxisArray", function() {
                    _drawChart();
                }, true);

                function _drawChart() {
                    $(element).highcharts({
                        chart: {
                            type: 'line',
                            height: 300
                        },
                        title: {
                            text: null
                        },
                        credits: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                        legend: {
                            enabled: false
                        },
                        xAxis: {
                            type: 'datetime',
                            gridLineWidth: 0
                        },
                        yAxis: scope.vm.yAxisArray,
                        plotOptions: {
                            line: {
                                dataLabels: {
                                    enabled: false
                                }
                            },
                            series: {
                                lineWidth: 2,
                                allowPointSelect: true,
                                cursor: 'pointer',
                                point: {
                                    events: {
                                        mouseOver: scope.vm.mouseOverFn
                                    }
                                },
                                marker: {
                                    enabled: false
                                }
                            }
                        },
                        tooltip: {
                            shared: true,
                            borderColor: '#fff',
                            formatter: function() {
                                var tooltip = '';
                                _.each(this.points, function(point, i, points) {
                                    tooltip += '<b style="font-weight:900;color:' + point.color + '">一 </b>' + point.y + point.series.tooltipOptions.unit + '<br/>';
                                });
                                tooltip += '<i>  ' + $filter('date')(this.x, 'yyyy-MM-dd HH:mm:ss') + "<br/>" + '</i>';
                                return tooltip;
                            },
                            crosshairs: [true, false]
                        },
                        series: scope.vm.series
                    });
                    scope.vm.chart = $(element).highcharts();
                }
            }
        }
    }

    function tbLoadMore($filter) {
        return {
            restrict: 'A',
            scope: {
                tableList: "=",
                filters: "="
            },
            link: function(scope, element) {
                var pageSize = 50,
                    currentPageSize = 0,
                    tableList = allList = scope.tableList;
                isEnd = false;
                $loadMore = $("<div class='tb-load-more'><a class='btn btn-xs'>加载更多</a></div>");

                element.after($loadMore);
                $loadMore.children("a").click(function() {
                    if (isEnd) {
                        return;
                    }
                    _updateCurrentPageSize();
                    scope.$apply(function() {
                        scope.tableList = $filter('limitTo')(tableList, currentPageSize);
                    });
                });


                scope.$watch('filters', function() {
                    tableList = allList;
                    _.each(scope.filters, function(value) {
                        //subtype： {key: '', value: ''} 对于根据subtype赛选则需要通过key
                        filter = _.isObject(value) ? value.key: value;
                        tableList = $filter('filter')(tableList, filter);
                    });
                    _updateCurrentPageSize();
                    scope.tableList = $filter('limitTo')(tableList, currentPageSize);
                }, true);

                function _updateCurrentPageSize() {
                    currentPageSize += pageSize;
                    if (tableList.length <= currentPageSize) {
                        currentPageSize = tableList.length;
                        isEnd = true;
                        $loadMore.hide();
                    } else {
                        $loadMore.show();
                    }
                }
            }
        }
    }

    function panelSwitch($location, $anchorScroll) {
        return {
            restrict: 'A',
            scope: {
                ctrl: "="
            },
            link: function(scope, element) {
                element.on("click", ".target-link", function() {
                    $location.hash('screen');
                    $anchorScroll();

                    var subtypeKey = $(this).attr("subtype-key"),
                        logKey = $(this).attr("log-key");
                    scope.$apply(function() {
                         scope.ctrl.filters = {
                             logFilter:  logKey || '',
                             subtasksFilter: _.find(scope.ctrl.subtypes, {key: subtypeKey}) || ''
                         };
                    });
                })
            }
        }
    }

    function scrollToBottomLazyLoad($timeout) {
        return {
            link: function(scope, element, attributes) {
                $(window).on("scroll", function() {
                    // 滚动条滚动到底部时加载, -1避免窗口缩放时出现不加载情况
                    if ($(window).scrollTop() + $(window).height() >= $(document).height() - 1) {
                        scope.$apply(function() {
                            scope.vm.snapshotsLoadTotal += Number(attributes["loadSize"]);
                        })
                    }
                })

                //在其它页面跳转进Snapshots
                if (scope.vm.isScrollToExceptionSnapshot) {
                    _scrollToExceptionSnapshot();
                }

                scope.$on('toSnapshots', function() {
                    _scrollToExceptionSnapshot();
                });

                function _scrollToExceptionSnapshot() {
                    if ($('img', element).length == 0 || $('img', element).first().height() <= 0) {
                         $timeout(_scrollToExceptionSnapshot, 100);
                    } else {
                        var snapshotHeight = $('.snapshot', element).first().outerHeight();
                        element.css('minHeight', snapshotHeight * scope.vm.rowNumber);
                        $(window).scrollTop($(document).height());
                    }
                }
            }
        }
    }

    function showCollapseBtnIfNeed() {
        return {
            link: function(scope, element) {
                setTimeout(function() {
                    var groupBodyHeight = element.prev().children(".horizontal-group-list").height(),
                        singleLineHeight = 50;

                    if (groupBodyHeight > singleLineHeight) {
                        element.removeClass("hide");
                    }
                }, 0)
            }
        }
    }

    function panelSwitchLogs($timeout) {
        return {
            restrict: 'A',
            scope: {
                scrollToLog: "="
            },
            link: function(scope, element) {
                if (scope.scrollToLog == 'true') {
                     //使用$anchorScroll方式进行跳转会导致table切换时跳转到页面顶部
                     $('img').load(function() {
                         $timeout(function() {
                             $('body').animate({scrollTop:$('.width-full-screen').offset().top}, 300);
                         }, 100)
                     });
                }
            }
        }
    }

    function pgyerHide(config) {
        return {
            restrict: 'A',
            link: function(scope, element) {
                if (config.isPgyer) {
                    element.hide();
                }
            }
        }
    }
})();
