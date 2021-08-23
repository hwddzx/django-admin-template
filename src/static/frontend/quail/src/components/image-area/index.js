(function() {

    angular.module("quail.image-area", [])
        .directive("imageLayoutArea", imageLayoutArea)
        .directive("imageSplitArea", imageSplitArea)
        .directive("imageParamArea", imageParamArea)
        .directive("imageMeasureArea", imageMeasureArea)
        .directive("imageStepArea", imageStepArea)
        .controller("AreaModalController", AreaModalController)
        .controller("againFixedPositionController", againFixedPositionController)
        .service("imageAreaService", imageAreaService);

    function imageLayoutArea($timeout, imageAreaService) {
        return {
            scope: {
                snapshot: "=",
                searchType: "@"
            },
            link: function(scope, element) {
                var imageArea,
                    $container = element.find(".area-container");

                scope.$on("snapshot:reload", function() {
                    $timeout(function() {
                        imageArea = imageAreaService.init(element, scope, 'rule');
                    });
                });

                scope.$on("snapshot:resize", function() {
                    imageArea && imageArea.renderAreas();
                });

                scope.$on("checkedLayout", function(e, xPath) {
                    if (!scope.snapshot) return;
                    _.each(scope.snapshot.rectCandidates, function(candidate, index) {
                        if (candidate.xPath == xPath) {
                            $container.find(".checked-layout").removeClass("checked-layout").end().find(".original").eq(index).addClass("checked-layout");
                            return false;
                        }
                    });
                })
            }
        }
    }

    function imageSplitArea($timeout, imageAreaService, PictureService, TestCaseService) {
        return {
            scope: {
                snapshot: "=",
                snapshots: "=",
                searchType: "@"
            },
            link: function(scope, element) {
                var imageArea,
                    $container = element.find(".area-container"),
                    $splitImg = $(".controller-search-type .split-img");

                $splitImg.click(function() {
                    $.fancybox($splitImg.attr('src'))
                });

                element.on("click", ".split-img", function() {
                    var $this = $(this),
                        area = $this.data("area");

                    $container.find(".checked").removeClass("checked");
                    $this.addClass("checked");
                    PictureService.getImageData(TestCaseService.getSnapshotOriginUrl(scope.snapshot), area).then(function(data) {
                        scope.$parent.$broadcast("createClickImage", {amendValidClickRect: area, clickImage: data});
                        $splitImg.attr("src", data);
                    })
                });

                scope.$on("snapshot:reload", function() {
                    $timeout(function() {
                        imageArea = imageAreaService.init(element, scope, 'rule', $splitImg);
                    });
                });

                scope.$on("snapshot:resize", function() {
                    imageArea && imageArea.renderAreas();
                });
            }
        }
    }

    function imageParamArea($timeout, TestCaseService, imageAreaService) {
        return {
            scope: {
                snapshot: "=",
                snapshots: "=",
                scriptJson: "=",
                paramType: "="
            },
            link: function(scope, element) {
                var imageArea,
                    deviceScreen,
                    $container = element.find(".area-container"),
                    $img = element.siblings("img");

                scope.$on("snapshot:reload", function() {
                    $timeout(function() {
                        imageArea = imageAreaService.init(element, scope, 'param');
                    });
                });

                scope.$watch("paramType", function(newVal) {
                    if (imageArea) imageArea.paramType = newVal;
                }, true);

                scope.$on("snapshot:resize", function() {
                    imageArea && imageArea.renderAreas();
                });

                scope.$on("again.fixed.position", function(event, data) {
                    getXPathBounds(data);
                });

                scope.$on("snapshot:area:remove", function(event, area) {
                    $container.find("." + area.name).remove();
                    $container.find(".param").each(function() {
                        var $area = $(this);
                        if ($area.data('area') == area) {
                            $area.remove();
                            _.remove(imageArea.model.ocrAreas, area);
                        }
                    });
                });

                function getXPathBounds(param) {
                    TestCaseService.getXPathBounds(param)
                        .then(function(data) {
                            deviceScreen = data.rootBounds;
                            _.each(data.bounds, function(value) {
                                var variableName = _.keys(value)[0];
                                $container.find('.' + variableName).remove();
                                _.each(value[variableName], function(bounds) {
                                    renderLayoutArea(variableName, bounds)
                                })
                            })
                        });
                }

                function renderLayoutArea(variableName, bounds) {
                    var w = $img.width(),
                        h = $img.height(),
                        screen = getValue(deviceScreen),
                        ratioX = screen.x2 / w,
                        ratioY = screen.y2 / h,
                        area = getValue(bounds),
                        $area = $("<div class='xpath-area " + variableName + "'></div>");

                    $area.css({
                        left: area.x1 / ratioX + 'px',
                        top: area.y1 / ratioY + 'px',
                        width: (area.x2 - area.x1) / ratioX + 'px',
                        height: (area.y2 - area.y1) / ratioY + 'px'
                    });
                    $container.append($area);
                }

                function getValue(bounds) {
                    var v1 = bounds.substring(bounds.indexOf("[") + 1, bounds.indexOf("]")),
                        v2 = bounds.substring(bounds.lastIndexOf("[") + 1, bounds.lastIndexOf("]"));

                    return {
                        x1: v1.split(",")[0],
                        y1: v1.split(",")[1],
                        x2: v2.split(",")[0],
                        y2: v2.split(",")[1]
                    };
                }
            }
        }
    }

    /*
    * 为脚本添加字段,Flcon测量界面响应时间
    * */
    function imageMeasureArea($timeout, imageAreaService, PictureService, TestCaseService) {
        return {
            scope: {
                snapshot: "=",
                snapshots: "=",
                scriptJson: "="
            },
            link: function(scope, element) {
                var imageArea,
                    $container = element.find(".area-container"),
                    $measureImg = $(".config .measure-img");

                $measureImg.click(function() {
                    $.fancybox($measureImg.attr("src"))
                });

                element.on("click", ".split-img", function() {
                    var $this = $(this),
                        area = $this.data("area");

                    $container.find(".checked").removeClass("checked");
                    $this.addClass("checked");
                    PictureService.getImageData(TestCaseService.getSnapshotOriginUrl(scope.snapshot), area).then(function(data) {
                        scope.$parent.$broadcast("measure", {
                            measureRect: area,
                            measureImage: data
                        });
                        $measureImg.attr("src", data);
                    })
                });

                scope.$on("snapshot:reload", function() {
                    $timeout(function() {
                        imageArea = imageAreaService.init(element, scope, "measure", $measureImg);
                    });
                });

                scope.$on("snapshot:resize", function() {
                    imageArea && imageArea.renderAreas();
                });

                scope.$on("measure:area:remove", function(event, isReverse) {
                    $container.find(".checked").removeClass("checked");
                    !scope.snapshot.splitImageRects && imageArea.clear();
                    $measureImg.attr("src", "");
                    isReverse && imageArea.renderAreas();
                });
            }
        }
    }

    function imageStepArea($timeout, TestCaseService, imageAreaService) {
        return {
            scope: {
                snapshot: "="
            },
            link: function(scope, element) {
                var imageArea,
                    deviceScreen,
                    $container = element.find(".area-container"),
                    $img = element.siblings("img");

                scope.$on("snapshot:reload", function() {
                    $timeout(function() {
                        imageArea = imageAreaService.init(element, scope, 'step');
                    });
                });
            }
        }
    }

    function AreaModalController($timeout, $stateParams, $scope, $uibModalInstance, ScriptJsonService, TESTCASE_ENUM, ableLayouts, model, regexps) {

        var noRegexp = {
                name: "不添加模版",
                reg_exp: null
            },
            matchAllRegexp = {
                name: "全部匹配",
                reg_exp: '(.*)',
                sub_string: '*',
                isCheckedAll: true
            };

        $scope.chooseMatchAllRegexp = false;
        $scope.ableLayouts = ableLayouts;
        $scope.model = model;
        $scope.model.nameExist = false;
        $scope.model.area.variableType = model.paramType == TESTCASE_ENUM.paramType.layout ? TESTCASE_ENUM.variableType.init : TESTCASE_ENUM.variableType.image;
        //$scope.model.area.variableType = TESTCASE_ENUM.variableType.init;
        $scope.model.area.expectNum = 0.8;
        $scope.checkSameParameter = checkSameParameter;
        $scope.close = close;
        $scope.cancel = cancel;
        $scope.switchLayoutText = switchLayoutText;
        $scope.chooseRegexp = chooseRegexp;
        $scope.changeAbleLayout = changeAbleLayout;

        // 把全部匹配(执行时后台获取)放到正则模板中第一个,控件识别值选择'*'时,自动选中"全部匹配"模板.但是模板列表不允许用户手段选择(隐藏)
        //$scope.regexps = [matchAllRegexp].concat(regexps);
        $scope.regexps = regexps;
        $scope.regexpSelected = noRegexp;
        $scope.isRegexpCheckedAll = false;
        $scope.checkedAbleLayoutIndex = undefined;

        if ( model.paramType == TESTCASE_ENUM.paramType.layout) activate();

        function activate() {
            var index = _.findIndex($scope.ableLayouts, function(layout) {
                return layout == _.minBy($scope.ableLayouts, function(t) {
                        return t.w * t.h;
                    })
            });

            changeAbleLayout(index);
        }

        function changeAbleLayout(index) {
            $scope.checkedAbleLayoutIndex = index;
            $scope.model.ableLayout = $scope.ableLayouts[index];
            switchLayoutText()
        }

        function switchLayoutText() {
            chooseRegexp();
        }

        function chooseRegexp(index) {
            if (index == '*') {
                $scope.chooseMatchAllRegexp = true;
                $scope.isRegexpCheckedAll = true;
                $scope.regexpSelected = matchAllRegexp; //全部匹配
            } else {
                $scope.regexpSelected = _.isNumber(index) ? $scope.regexps[index] : noRegexp;
            }
            $scope.regexpSelected.isValidate = true;
            $scope.model.area.origin = $scope.model.ableLayout.content;

            if ($scope.isRegexpCheckedAll) {
                $scope.model.area.expectValue = "*";
            } else {
                $scope.model.area.expectValue = $scope.regexpSelected.reg_exp ? _matchContent() : $scope.model.ableLayout.content;
            }
        }

        function _matchContent() {
            try {
                return $scope.model.ableLayout.sub_string = $scope.model.ableLayout.content.match(new RegExp($scope.regexpSelected.reg_exp))[1];
            } catch (e) {
                $scope.regexpSelected.isValidate = false;
                return $scope.model.ableLayout.content;
            }
        }

        function checkSameParameter() {
            model.nameExist = ScriptJsonService.getScriptJsonInstance($stateParams.id).hasSameParam($scope.model.area.name) ? '' : 'true';
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }

        function close() {
            //if(!$scope.regexpSelected.isValidate) return; // 正则不能匹配出子串,不允许用户保存

            if ($scope.regexpSelected.reg_exp) {
                $scope.model.area.regExp = $scope.regexpSelected.reg_exp;
                $scope.model.area.regExpName = $scope.regexpSelected.name
            }
            if($scope.model.area.name == undefined || $scope.model.area.name == ""){
                $scope.model.area.name = document.getElementById('outputName').value;
            }
            $scope.model.area.name && $uibModalInstance.close($scope.model);
        }
    }

    function againFixedPositionController($rootScope, $scope, $uibModalInstance, model) {
        var vm = this;

        vm.model = model;

        vm.close = close;
        vm.cancel = cancel;

        $scope.$watch("vm.model.checkedXPath", xPathChange);

        function xPathChange() {
            var xPath = [],
                param = {};
            param[vm.model.action.variableName] = vm.model.checkedXPath.xPath;
            xPath.push(param);

            $rootScope.$broadcast("again.fixed.position", {
                xml_url: vm.model.layoutUrl,
                xpath: xPath
            });
        }

        function close() {
            $uibModalInstance.close(vm.model);
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }
    }

    function imageAreaService($q, $stateParams, ModalService, DialogService, PictureService, TestCaseService, spinner, RegexpsTemplateService, LayoutService, TESTCASE_ENUM) {
        var ABSOLUTE_TO_RELATIVE = 0,
            RELATIVE_TO_ABSOLUTE = 1;

        return {
            init: init
        };
        function init(element, scope, category, splitImg) {
            var current = Object.create(this);
            _.extend(current, {
                $container: element.find(".area-container"),
                $dashboard: element.find(".area-dashboard"),
                $img: element.siblings("img"),
                $splitImg: splitImg,
                category: category,
                clear: clear,
                model: {},
                renderAreas: renderAreas,
                dashboard: dashboard
            }, scope);

            current.category !== "step" && current.renderAreas();
            // 老图像图像识别方式和定义输出参数需要框选功能
            if ((current.category == "rule" || current.category == "measure") && !current.snapshot.splitImageRects || _.indexOf(["param", "step"], current.category) > -1) {
                current.dashboard();
            }
            return current
        }

        function dashboard() {
            var current = this,
                snapshot = current.snapshot;

            current.$dashboard.off("mousedown").on("mousedown", function(event) {

                var $area, area = {}, $arrow, startCoordinate, endCoordinate,
                    isDragArrow = TESTCASE_ENUM.createComponentType.drag == snapshot.createComponentType && _.includes([TESTCASE_ENUM.dragType.scrollByCoordinate, TESTCASE_ENUM.dragType.scrollableXpath], snapshot.dragType),
                    containerWidth = current.$container.width(),
                    containerHeight = current.$container.height();

                // 距离边缘5px以内自动吸附
                function adsorption(event, key) {
                    var temp = key == "offsetX" ? containerWidth : containerHeight;
                    // 左边缘或上边缘
                    if (event[key] <= 5) {
                        return 0;
                        // 右边缘或下边缘
                    } else if (temp - event[key] <= 5) {
                        return temp;
                    } else {
                        return event[key];
                    }
                }

                area.start = {
                    x: adsorption(event, "offsetX"),
                    y: adsorption(event, "offsetY")
                };

                if (isDragArrow) {
                    $area = $('<hr class="drag-hr">');
                    $arrow = $('<div class="drag-arrow '+ snapshot.dragDirection+'"></div>');

                    $area.css({
                        left: area.start.x + 'px',
                        top: area.start.y + 'px'
                    });
                    $arrow.css({
                        left: area.start.x + 'px',
                        top: area.start.y + 'px'
                    })
                } else {
                    $area = $("<div class=" + current.category + "></div>");
                    $area.css({
                        left: area.start.x + 'px',
                        top: area.start.y + 'px'
                    });
                }

                current.$dashboard.on("mousemove", mousemoveListener);
                current.$dashboard.on("mouseup mouseleave", mouseupListener);

                function mousemoveListener(event) {
                    if (!area.w) {
                        current.$container.append($area);
                        if (isDragArrow) {
                            current.$container.append($arrow);
                        }
                    }

                    area.end = {
                        x: adsorption(event, "offsetX"),
                        y: adsorption(event, "offsetY")
                    };

                    area.w = Math.abs(area.start.x - area.end.x);
                    area.h = Math.abs(area.start.y - area.end.y);

                    if (isDragArrow) {
                        var x,y;
                        switch (snapshot.dragDirection) {
                            case TESTCASE_ENUM.dragDirection.up:
                                x = area.end.x;
                                y = area.end.y;
                                area.w = 2;
                                area.h = area.end.y < area.start.y ? area.start.y - area.end.y : 1;
                                break;
                            case TESTCASE_ENUM.dragDirection.down:
                                x = area.end.x;
                                y = area.start.y;
                                area.w = 2;
                                area.h = area.end.y > area.start.y ? area.end.y - area.start.y : 1;
                                break;
                            case TESTCASE_ENUM.dragDirection.left:
                                x = area.end.x;
                                y = area.end.y;
                                area.h = 2;
                                area.w = area.end.x < area.start.x ? area.start.x - area.end.x : 1;
                                break;
                            case TESTCASE_ENUM.dragDirection.right:
                                x = area.start.x;
                                y = area.end.y;
                                area.w = area.end.x > area.start.x ? area.end.x - area.start.x : 1;
                                area.h = 2;
                                break;
                        }
                        $arrow.css({
                            left: area.end.x,
                            top: area.end.y
                        });
                        $area.css({
                            left: x,
                            top: y,
                            width: area.w,
                            height: area.h
                        });

                        startCoordinate = transformAreaPosition({x: area.start.x, y: area.start.y, w: area.w, h: area.h}, ABSOLUTE_TO_RELATIVE, current);
                        endCoordinate = transformAreaPosition({x: area.end.x, y: area.end.y, w: area.w, h: area.h}, ABSOLUTE_TO_RELATIVE, current);
                    } else {
                        area.x = Math.min(area.start.x, area.end.x);
                        area.y = Math.min(area.start.y, area.end.y);

                        $area.css({
                            left: area.x + 'px',
                            top: area.y + 'px',
                            width: area.w + 'px',
                            height: area.h + 'px'
                        });
                    }
                }

                function mouseupListener(event) {
                    mousemoveListener(event);

                    current.$dashboard.unbind("mousemove", mousemoveListener);
                    current.$dashboard.unbind("mouseup mouseleave", mouseupListener);

                    if (!area.w) {
                        $area.remove();
                        return;
                    } else if (current.category == "rule" || current.category == "measure") {
                        if (current.$container.find('.' + current.category).length > 1) {
                            $('.' + current.category, current.$container).first().remove();
                        }
                    }

                    var originArea = transformAreaPosition(area, ABSOLUTE_TO_RELATIVE, current);

                    if (current.category == "rule") {
                        if (current.searchType == "image") {
                            spinner.show();
                            PictureService.getImageData(TestCaseService.getSnapshotOriginUrl(snapshot), originArea)
                                .then(function(imgBase64) {
                                        spinner.hide();
                                        current.$splitImg.attr("src", imgBase64);
                                        $area.data("area", originArea);
                                        $area.html(area.name);

                                        current.$parent.$broadcast("createClickImage", {
                                            amendValidClickRect: originArea,
                                            clickImage: imgBase64
                                        });
                                    },
                                    function() {
                                        $area.remove();
                                        spinner.hide();
                                    }
                                );
                        }
                    } else if(current.category == "measure") {
                        spinner.show();
                        PictureService.getImageData(TestCaseService.getSnapshotOriginUrl(snapshot), originArea)
                            .then(function(imgBase64) {
                                    spinner.hide();
                                    current.$splitImg.attr("src", imgBase64);
                                    $area.data("area", originArea);
                                    $area.html(area.name);

                                    current.$parent.$broadcast("measure", {
                                        measureRect: originArea,
                                        measureImage: imgBase64
                                    });
                                },
                                function() {
                                    $area.remove();
                                    spinner.hide();
                                }
                            );
                    } else if (current.category == "step") {
                        var params = {
                            actionId: snapshot.resourceId || snapshot.key,// SS需要的actionId是增加步骤原图上的actionId(或者新增步骤上的resourceId)
                            sleep: 1000
                        };
                        if (TESTCASE_ENUM.createComponentType.drag == snapshot.createComponentType) {
                            if (TESTCASE_ENUM.dragType.scrollableXpath == snapshot.dragType) {
                                _.extend(params, {
                                    action: "dragObject",
                                    direction: snapshot.dragDirection,
                                    distance: (snapshot.dragDirection == TESTCASE_ENUM.dragDirection.up || snapshot.dragDirection == TESTCASE_ENUM.dragDirection.down) ? originArea.h : originArea.w,
                                    params: [{
                                        value: startCoordinate.x,
                                        key: "x"
                                    }, {
                                        value: startCoordinate.y,
                                        key: "y"
                                    }]
                                })
                            } else if (TESTCASE_ENUM.dragType.scrollIntoView == snapshot.dragType) {
                                _.extend(params, {
                                    action: "scrollIntoView",
                                    direction: snapshot.dragOrientation,
                                    distance: snapshot.dragOrientation == "horizontal" ? area.w : area.h,
                                    params: [{
                                        value: originArea.x + originArea.w / 2,
                                        key: "x"
                                    }, {
                                        value: originArea.y + originArea.h / 2,
                                        key: "y"
                                    }]
                                })
                            } else {
                                _.extend(params, {
                                    resourceId: snapshot.resourceId || snapshot.key,
                                    actionId: new Date().getTime() + "_" + snapshot.key.split("_").pop(),
                                    action: "drag",
                                    params: [{
                                        value: {
                                            moves: [{x: startCoordinate.x, y: startCoordinate.y}, {
                                                x: endCoordinate.x,
                                                y: endCoordinate.y
                                            }],
                                            type: "short"
                                        },
                                        key: "coordinate"
                                    }]
                                });
                                params.params[0].value = JSON.stringify(params.params[0].value);
                                params.params[0].value = params.params[0].value.replace(/"/g, "\"");
                            }
                        } else {
                            params = [{
                                value: originArea.x + originArea.w / 2,
                                key: "x"
                            }, {
                                value: originArea.y + originArea.h / 2,
                                key: "y"
                            }]
                        }
                        current.$parent.$broadcast("addStep", params);
                        current.clear();
                    } else {
                        var isReupload = false;
                        getSnapshotLayouts();
                        function getSnapshotLayouts() {
                            TestCaseService.getSnapshotLayouts(snapshot.miniLayoutUrl)
                                .then(configParam, reuploadAnchor)
                        }

                        /*
                         * isCustomAnchor为true,表示anchor文件获取失败,layouts是通过xml产生的自定义anchor
                         * */
                        function configParam(layouts, isCustomAnchor) {
                            var ableLayouts = isCustomAnchor ? layouts :
                                //判断area的中点是否在layout的区域内
                                _.filter(layouts["textAreas"] || [], function(layout) {
                                    var centerPoint = {
                                        x: originArea.x + originArea.w / 2,
                                        y: originArea.y + originArea.h / 2
                                    };

                                    return (centerPoint.x >= layout.x &&
                                    centerPoint.x <= (layout.x + layout.w) &&
                                    centerPoint.y >= layout.y &&
                                    centerPoint.y <= (layout.y + layout.h));
                                });
                            if (_.isEmpty(ableLayouts) && current.paramType == TESTCASE_ENUM.paramType.layout) {
                                DialogService.error("Layout识别错误!");
                                $area.remove();
                                return $q.reject({});
                            }
                            ModalService.show({
                                    templateUrl: 'components/image-area/area.name.html',
                                    windowClass: 'area-name-modal',
                                    resolve: {
                                        ableLayouts: function() {
                                            return ableLayouts;
                                        },
                                        model: function() {
                                            return {
                                                area: originArea,
                                                snapshot: snapshot,
                                                snapshots: current.snapshots,
                                                scriptJson: current.scriptJson,
                                                parentModel: current.model,
                                                paramType: current.paramType
                                            };
                                        },
                                        regexps: function() {
                                            return RegexpsTemplateService.getRegexps($stateParams.key)
                                        }
                                    },
                                    controller: 'AreaModalController',
                                    backdrop: 'static'
                                })
                                .then(function(model) {
                                    originArea.expect = [originArea.expectValue];
                                    originArea.position = {
                                        x: originArea.x,
                                        y: originArea.y,
                                        w: originArea.w,
                                        h: originArea.h
                                    };
                                    if (originArea.variableType == TESTCASE_ENUM.variableType.update) {
                                        originArea.index = _.filter(snapshot.ocrAreas, {action: "updateVariable"}).length;
                                        originArea.checkVariable = false;
                                        originArea.action = "updateVariable";
                                    } else {
                                        originArea.checkVariable = true;
                                        originArea.action = "initVariable";
                                    }

                                    return (function() {
                                        var actionId = snapshot.key,
                                            action = _.find(current.scriptJson.actions, function(action) {
                                                return (action.actionId == actionId) && (_.indexOf(TESTCASE_ENUM.snapshotActions, action.action) > -1);
                                            }),
                                            params;
                                        if (originArea.variableType != TESTCASE_ENUM.variableType.image) {
                                            params = {
                                                action: {
                                                    actionId: action.resourceId || action.actionId,
                                                    action: originArea.action,
                                                    expect: originArea.expectValue,
                                                    origin: originArea.origin,
                                                    variableName: originArea.name,
                                                    index: originArea.index,
                                                    checkVariable: originArea.checkVariable,
                                                    variableRegex: originArea.regExp
                                                },
                                                position: {
                                                    x: model.ableLayout.x,
                                                    y: model.ableLayout.y,
                                                    w: model.ableLayout.w,
                                                    h: model.ableLayout.h
                                                }
                                            };
                                        } else {
                                            params = {
                                                action: {
                                                    actionId: action.resourceId || action.actionId,
                                                    action: 'imageVariable',
                                                    expect: originArea.expectNum,
                                                    variableName: originArea.name,
                                                    index: originArea.index,
                                                    checkVariable: true,
                                                    variableRegex: originArea.regExp
                                                }
                                            };
                                        }
                                        return isCustomAnchor || originArea.variableType == TESTCASE_ENUM.variableType.image ? $q.when(params) : TestCaseService.getParamAction(params);
                                    })()
                                })
                                .then(function(originAction) {
                                    if(isCustomAnchor) return $q.when(originAction);
                                    if (originAction.action.action == 'imageVariable') return $q.when(originAction);
                                    // 默认选中xPathDefault,'xPathDefault'一定存在,'xPathIndex'和'xPathText'不一定存在
                                    var action = _.omit.apply(null, [originAction].concat(TESTCASE_ENUM.xPathKeys)),
                                        xPaths = _.pick.apply(null, [originAction].concat(TESTCASE_ENUM.xPathKeys)),
                                        xPathKinds = _.keys(xPaths);

                                    // xpath种类多于1种才弹框让用户选择，图片参数不选择
                                    if (xPathKinds.length == 1 || originArea.variableType == TESTCASE_ENUM.variableType.image) {
                                        return $q.when({action: action, checkedXPath: xPaths.xPathDefault});
                                    } else {
                                        return ModalService.show({
                                            templateUrl: 'components/image-area/again.fixed.position.html',
                                            windowClass: 'again-fixed-position-modal',
                                            model: {
                                                checkedXPath: xPaths.xPathText[0] ? xPaths.xPathText[0] : xPaths.xPathDefault,
                                                layoutUrl: snapshot.layoutUrl,
                                                xPaths: xPaths,
                                                action: action
                                            },
                                            controllerAs: 'vm',
                                            controller: 'againFixedPositionController',
                                            backdrop: 'static',
                                            size: 'md'
                                        })
                                    }

                                })
                                .then(function(model) {
                                    // 1.tc需要anchor文件中layout的坐标,前端需要用户框的坐标 2.插入参数步骤的actionId需要当前截图的actionId
                                    if (originArea.variableType != TESTCASE_ENUM.variableType.image) {
                                        _.merge(model.action, {
                                            position: originArea.position,
                                            actionId: snapshot.key
                                        }, isCustomAnchor ? {
                                            "xPath": layouts.path,
                                            "xPathWithoutResId": layouts.path,
                                            actionId: snapshot.key
                                        } : model.checkedXPath);
                                    } else {  // 图片参数
                                        _.merge(model.action, {
                                            rect: "[" + originArea.position.x + "," + originArea.position.y + "][" + (originArea.position.x + originArea.position.w) + "," + (originArea.position.y + originArea.position.h) + "]",
                                            actionId: snapshot.key
                                        });
                                    }
                                    _insertAction(model.action);
                                })
                                .catch(function(e) {
                                    // 取消框选参数框,删除对应框选框
                                    $area.remove();
                                    // 取消二次定位框删除对应虚线框
                                    originArea.name && current.$container.find('.' + originArea.name).remove();
                                });
                        }

                        function _insertAction(action) {
                            if (originArea.variableType == TESTCASE_ENUM.variableType.image) {
                                originArea.expectValue = originArea.expectNum;
                                originArea.action = 'imageVariable';
                            }
                            snapshot.ocrAreas.push(originArea);
                            current.model.ocrAreas.push(originArea);
                            $area.data("area", originArea);
                            $area.html(originArea.name);
                            current.$parent.$broadcast("addSnapshotParams", action);
                        }

                        function reuploadAnchor() {
                            if(isReupload) return;
                            var p =

                                TestCaseService.getActionScript("anchor",
                                    _.chain(current.scriptJson.actions)
                                        .find(function(action) {
                                            return action.actionId == snapshot.key && TESTCASE_ENUM.mainControlActions.indexOf(action.action) > -1
                                        })
                                        .pick("action", "actionId", "params").value())
                                    .then(getSnapshotLayouts)
                                    .then(null, function() {
                                        configParam(LayoutService.getAnchorByXml("xml-tree", originArea), true)
                                    })
                                    .finally(function() {
                                        // 只重新上传一个anchor文件
                                        isReupload = true;
                                    })
                        }
                    }
                }

            });
        }

        function clear() {
            var current = this;
            current.category == "param" && (current.model.ocrAreas = []);
            current.$container.empty();
        }

        function renderAreas() {
            var current = this,
                snapshot = current.snapshot;

            current.clear();
            if (!snapshot) {
                return
            }

            if (current.category == "rule" || current.category == "measure") {
                var rect;
                if (current.searchType == "control") {
                    if (_.isEmpty(snapshot.rectCandidates)) {
                        // 兼容老数据
                        if (snapshot.validClickRect) {
                            renderArea(snapshot.validClickRect, "original");
                        }
                    } else {
                        _.each(snapshot.rectCandidates, function(rectCandidate) {
                            renderArea(rectCandidate, (rectCandidate.xPath == snapshot.validClickRect.xPath) ? "original checked-layout" : "original")
                        });
                    }

                }
                if (current.searchType == "image" || current.category == "measure") {
                    // 优先使用新图像识别
                    rect = snapshot[current.category == "rule" ? "amendValidClickRect" : "measureRect"];
                    if (snapshot.splitImageRects) {
                        snapshot.splitImageRects = _.sortBy(snapshot.splitImageRects, function(splitImageRect) {
                            return splitImageRect.w * splitImageRect.h;
                        }).reverse();
                        _.each(snapshot.splitImageRects, function(splitImageRect, index) {
                            splitImageRect["z-index"] = index + 1;// 按升序加个z-index,保证面积最小的层级放在最上层,用户才能点到
                            renderArea(splitImageRect, (rect && rect.id == splitImageRect.id) ? "split-img checked" : "split-img")
                        })
                    } else {
                        if (rect) {
                            renderArea(rect, current.category);
                        }
                    }

                    if (rect) {
                        PictureService.getImageData(TestCaseService.getSnapshotOriginUrl(snapshot), rect).then(function(data) {
                            snapshot[current.category == "rule" ? "clickImage" : "measureImage"] = data;
                            current.$splitImg.attr("src", data);
                        })
                    } else {
                        current.$splitImg.attr("src", '');
                    }
                }
            } else {
                _.each(snapshot.ocrAreas, function(ocrArea) {
                    renderArea(ocrArea, current.category);
                });
            }

            function renderArea(item, name) {
                var $area = $("<div class='" + name + "'></div>"),
                    transArea = transformAreaPosition(item.position || item, RELATIVE_TO_ABSOLUTE, current);

                $area.css({
                    left: transArea.x + 'px',
                    top: transArea.y + 'px',
                    width: transArea.w + 'px',
                    height: transArea.h + 'px',
                    'z-index': item["z-index"]
                });

                $area.data("area", item);
                current.$container.append($area);
                if (current.category == "param") {
                    current.model.ocrAreas.push(item);
                }
            }
        }

        /*area坐标转换
         * ABSOLUTE_TO_RELATIVE: 通过css属性和图片得到比例系数
         * RELATIVE_TO_ABSOLUTE: 通过比例系数和图片得到css值
         * */
        function transformAreaPosition(area, direct, current) {
            var transformedArea,
                finalSize = current.snapshot.finalSize;

            if (!finalSize) {
                finalSize = {
                    width: current.$img.width(),
                    height: current.$img.height()
                }
            }

            if (direct == ABSOLUTE_TO_RELATIVE) {
                transformedArea = {
                    x: parseFloat((area.x / finalSize.width).toFixed(8)),
                    y: parseFloat((area.y / finalSize.height).toFixed(8)),
                    w: parseFloat((area.w / finalSize.width).toFixed(8)),
                    h: parseFloat((area.h / finalSize.height).toFixed(8))
                };
            } else {
                transformedArea = {
                    x: Math.floor(area.x * finalSize.width),
                    y: Math.floor(area.y * finalSize.height),
                    w: Math.floor(area.w * finalSize.width),
                    h: Math.floor(area.h * finalSize.height)
                };
            }

            return transformedArea;
        }
    }
})();