angular.module('control-panes')
    .directive('deviceControlTabs', DeviceControlTabsDirective)
    .directive('tabExpandBtn', tabExpandBtnDirective)
    .directive('tbLabHide', tbLabHide);

function DeviceControlTabsDirective() {

    return {
        restrict: 'A',
        scope: {
            'device': '=',
            'control': '='
        },
        transclude: true,
        controller: function($rootScope, $scope) {

            $scope.deviceType = $rootScope.deviceType;
            $scope.screenshotSteps = 10;

            $scope.tabs = [{
                name: 'logs',
                templateUrl: 'app/control-panes/logs/logs.html',
            }, {
                name: 'shell',
                templateUrl: 'app/control-panes/shell/shell.html'
            }, {
                name: 'video',
                templateUrl: 'app/control-panes/video/video.html'
            }, {
                name: 'upload',
                templateUrl: 'app/control-panes/upload/upload.html',
                fullScreen: true
            }, {
                name: 'info',
                templateUrl: 'app/control-panes/info/info.html',
                fullScreen: true
            }, {
                name: 'photo',
                templateUrl: 'app/control-panes/photo/photo.html',
                fullScreen: true
            }]

            $scope.screenshots = 0;

            $scope.selectTab = function(name) {
                var curTab, prevActiveTab = $scope.activeTab;

                curTab = _.find($scope.tabs, {
                    name: name
                });

                if (prevActiveTab && prevActiveTab !== curTab) {
                    prevActiveTab.active = false;
                }

                curTab.active = !curTab.active;

                if (curTab.active) {
                    $scope.activeTab = curTab;
                }

                if (name === 'upload') {
                    $rootScope.$broadcast("clear:upload:badge");
                }

                if(name==='info' && curTab.active){
                    $rootScope.$broadcast("reload:device:runtime");
                }

                //?????????video tab????????????????????????
                if ($scope.activeTab && $scope.activeTab.active && $scope.activeTab.name === 'video') {
                    $scope.screenshots = 0;
                }

            }

            $scope.getTab = function(name) {
                return _.find($scope.tabs, {
                    name: name
                });
            }

            $scope.run = function(command) {
                $scope.$broadcast("run:command", command);
                $scope.command = "";
            }

            $scope.getAnimal = function(tab) {
                return tab.fullScreen ? 'full-animal' : 'normal-animal';
            }

            $scope.addScreenshot = function() {
                $scope.screenshots++;
                $scope.screenshots = Math.min(99, $scope.screenshots);
            }

            $rootScope.$on("add:screenshot", function() {
                //?????????????????????tab??????video???????????????????????????
                if (!($scope.activeTab && $scope.activeTab.active && ($scope.activeTab.name === 'video'))) {
                    $scope.addScreenshot();
                }
            });

        },
        compile: function() {

            return function(scope, element, attrs, controller, transclude) {
                transclude(scope, function(clone) {
                    element.append(clone);
                });

                $(".tab-conent").on("click", ".icon-sidebar-close", function(event) {
                    scope.$apply(function() {
                        scope.selectTab($(".modal-show").attr("data-item"));
                    });
                    $(".control-panel-wrap").removeClass("half-mode");
                })

                if ($("body").height() < 660) {
                    element.addClass("scroll-mode");
                }

                element.on("click", ".tabs>li", function(event) {
                    var $this = $(this),
                        $target = $(event.currentTarget),
                        currentTab = scope.getTab($this.attr("data-item")),
                        $currentModal = $("#modal-" + currentTab.name).find(".tab-modal"),
                        $activeModal = $(".modal-show"),
                        $controlPanelWrap = $(".control-panel-wrap");

                    var hasModalActivated = $(".modal-show").length,
                        currentModalActivated = scope.activeTab ? ($this.attr("data-item") == scope.activeTab.name) : false,
                        isActiveModalFullMode = scope.activeTab ? $("#modal-" + scope.activeTab.name).find(".tab-modal").hasClass("tab-modal-full") : false,
                        isCurrentModalFullMode = $currentModal.hasClass("tab-modal-full");

                    //??????????????????modal?????????,screen??????
                    if (!hasModalActivated) {
                        $controlPanelWrap.addClass("half-mode");
                    }

                    //???????????????modal???????????????currentModal
                    if (hasModalActivated && currentModalActivated) {
                        $controlPanelWrap.removeClass("half-mode");
                    }

                    //???????????????modal??????????????????currentModal
                    if (hasModalActivated && !currentModalActivated) {

                        //???????????????tab????????????css3??????
                        _toggleTransition($currentModal);
                        _toggleTransition($activeModal);

                        if (isActiveModalFullMode && !isCurrentModalFullMode) {
                            // $controlPanelWrap.addClass("move-up");
                            //???full mode modal????????? ??????modal?????????????????????css3??????
                            _toggleTransition($controlPanelWrap);
                        } else if (!isActiveModalFullMode && isCurrentModalFullMode) {
                            // $controlPanelWrap.removeClass("move-up");
                        } else if (!isActiveModalFullMode && !isCurrentModalFullMode) {
                            // $controlPanelWrap.addClass("move-up");
                        }

                    }

                    function _toggleTransition($target) {
                        $target.addClass("disable-transition");
                        setTimeout(function() {
                            $target.removeClass("disable-transition");
                        })
                    }

                    scope.$apply(function() {
                        scope.selectTab($this.attr("data-item"))
                    });
                    $target.siblings().removeClass("active");
                    $target.parent().siblings().children().removeClass("active");
                    $target.toggleClass("active");
                });
            }
        }

    }

}

function tabExpandBtnDirective() {
    return {
        restrict: 'A',
        link: function(scope, element) {
            element.click(function() {
                var $tab = element.closest(".tab-modal"),
                    $controlPanelWrap = $(".control-panel-wrap");

                $tab.toggleClass("tab-modal-full");
                element.find("i").toggleClass("fa-expand").toggleClass("fa-compress");
                if ($tab.hasClass("tab-modal-full")) {
                    $controlPanelWrap.removeClass("move-up");
                } else {
                    $controlPanelWrap.addClass("move-up");
                }
            })
        }
    }
}
/**
 * ??????????????????logcat-table.css
 * */
angular.module('control-panes').directive('guideDirective', function guideDirective($compile) {
    return {
        link: function(scope, element, attr) {
            if (window.localStorage) {
                // todo ???????????????,????????????????????????
                return;
                if (!(localStorage.getItem('isShowedGuide') == 'true')) {
                    $(window).scrollTop(0);
                    container = $(element).showGuide(),
                        templateName = attr['guideTemplate'];

                    if (templateName == "guide-rent-time.html") {
                        element.addClass('guide-rent-time');
                    }
                    templateHtml = $compile($.parseHTML('<div ng-include="\'app/control-panes/templates/' + templateName + '\'"></div>'))(scope);
                    container.append(templateHtml);
                    scope.$on("$stateChangeStart", function() {
                        //???????????????????????????????????????????????????????????????????????????????????????ui-router???????????????????????????????????????????????????????????????????????????????????????
                        $(element).closeGuide();
                    })
                }
            }
        }
    }
});

angular.module('control-panes').directive('inputTextDialog', function inputTextDialog(SocketService) {
    return {
        templateUrl: 'app/control-panes/templates/input.text.html',
        link: function(scope, element, attrs) {

            scope.inputTextDialog = function() {
                scope.$emit("inputTextDialog", {body: 'on'});
            };

            scope.inputTextDialogBack = function() {
                scope.$emit("inputTextDialog", {body: 'off'});
            };

            var input = element.find('textarea');

            scope.$on("device:apply", function() {
                SocketService.getSocket().on("IME.on", _imeListener);
                SocketService.getSocket().on("ime", _imeListener);
                SocketService.getSocket().on("device.ime", _imeListener);

                scope.$on("inputTextDialog", function(name, res) {
                    _imeListener(res)
                });

                function _imeListener(res) {
                    if (res.body == 'on') {
                        _clearInput();
                        element.fadeIn('fast', function() {
                            input.focus();
                        });
                    } else if (res.body == 'clear') {
                        _clearInput();
                    } else {
                        element.fadeOut();
                    }
                }
            });

            function _clearInput() {
                input.val('');
            }

            element.on('click', '.btn', function() {
                var text = input.val();
                scope.control.inputText(text);
            });
        }
    }
});

function tbLabHide(config) {
    return {
        restrict: 'MA',
        link: function(scope, element, attrs) {
            if (config.isLab()){
                element.hide();
            }
        }
    }
}
