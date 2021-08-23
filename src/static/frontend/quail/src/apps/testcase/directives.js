(function() {
    angular.module("quail.testcases")
        .directive("setFocus", setFocus)
        .directive("tbFadeIn", tbFadeIn)
        .directive("tbCenterImage", tbCenterImage)
        .directive("tbTestcaseSnapshot", tbTestcaseSnapshot)
        .directive("tbComponentSnapshot", tbComponentSnapshot)
        .directive("tbTestcaseSnapshotSlider", tbTestcaseSnapshotSlider)
        .directive("tbPluginParameterModel", tbPluginParameterModel)
        .directive("tbAnchorArea", tbAnchorArea)
        .directive("tbXmlArea", tbXmlArea)
        .directive("jsonBlock", jsonBlock)
        .directive("tbSnapshotSpliter", tbSnapshotSpliter)
        .directive("testcaseUploadScript", testcaseUploadScript)
        .directive("regexpFormatText", regexpFormatText);

    function setFocus($timeout){
        return {
            restrict: 'AE',
            link:function(scope, element, attrs){
                attrs.$observe('focusOn',function(val){
                    if (val == "true") {
                        $timeout(function() {
                            $(element).focus();
                        }, 200)
                    }
                })
            }
        }
    }

    function tbFadeIn() {
        return {
            restrict: "A",
            link: function(scope, element, attrs) {
                var $target = $("#" + attrs.target),
                    $container = $("#" + attrs.container);

                $target.css("top", "-" + "100%");

                $target.find("[data-fade-up]").unbind("click");
                $target.find("[data-fade-up]").click(function() {
                    $target.animate({ top: "-" + "100%" }, 500, function() {
                        $container.removeClass("front");
                    })
                });

                element.on("click", function() {
                    $container.addClass("front");
                    $target.animate({ top: 0 }, 500);
                });
            }
        }
    }

    function tbCenterImage() {
        return {
            restrict: 'C',
            link: function(scope, element, attrs) {
                var boxSize = 100;
                element.css({
                    "margin-left": element.parent().width() / 2 + 'px',
                    "margin-top": element.parent().height() / 2 + 'px',
                    "display": "none",
                    "position": "absolute"
                });
                element[0].onload = function() {
                    var scale = 1,
                        w = element[0].width,
                        h = element[0].height;

                    //如果图片横屏，则高度缩放到100，如果图片竖屏则宽度缩放到100
                    scale = w < h ? (boxSize / w) : (boxSize / h);
                    w = scale * w;
                    h = scale * h;

                    if (w < h) {
                        element.css("max-width", boxSize + 'px');
                    } else {
                        element.css("max-height", boxSize + 'px');
                    }

                    element.css({
                        left: '-' + w / 2 + 'px',
                        top: '-' + h / 2 + 'px',
                        "display": "block"
                    });
                }
            }
        }
    }

    function tbVerticalImage() {
        return {
            restrict: 'C',
            link: function(scope, element, attrs) {
                var verWidth = attrs.verWidth; //竖屏最大宽度
                element[0].onload = function() {
                    var w = element[0].width,
                        h = element[0].height;
                    element.css("max-width", (w > h ? horWidth : verWidth) + 'px');
                }
            }
        }
    }

    function tbTestcaseSnapshot() {
        return {
            link: function(scope, element, attrs) {
                var $parent = element.parent(),
                    $siblings = element.siblings();

                scope.$on("snapshot:resize", function(){
                    updateLineHeight();
                });

                element.load(function() {
                    updateLineHeight();
                });

                function updateLineHeight() {
                    if (element.hasClass("max-height-640")) {
                        element.removeClass("max-height-640");
                    }

                    var width = element.width(),
                        height = element.height();

                    // 图片超过640的时候,按照640显示
                    if (width < height && element.parent().height() > 640) {
                        element.addClass("max-height-640");
                        width = element.width();
                        height = element.height();
                    }
                    $parent.css('line-height', $parent.height() + 'px');
                    $siblings.css({
                        position: "absolute",
                        left: '50%',
                        top: '50%',
                        'margin-left': '-' + width / 2 + 'px',
                        'margin-top': '-' + height / 2 + 'px',
                        width: width + 'px',
                        height: height + 'px'
                    });
                }

            }
        }
    }

    function tbComponentSnapshot() {
        return {
            link: function(scope, element, attrs) {
                var $parent = element.parent();

                updateLineHeight();

                scope.$on("snapshot:resize", function(){
                    updateLineHeight();
                });

                function updateLineHeight() {

                    var w = 360,
                        h = 640,
                        parentH = $parent.height(),
                        ratio = w / h;

                    if (parentH < w / ratio) {
                        w = parentH * ratio;
                        h = parentH;
                    }

                    element.css({
                        position: "absolute",
                        left: '50%',
                        top: '50%',
                        width: w,
                        height: h,
                        'line-height': h / 2 + 'px',
                        'margin-left': '-' + w / 2 + 'px',
                        'margin-top': '-' + h / 2 + 'px'
                    });
                }

            }
        }
    }

    function tbTestcaseSnapshotSlider() {
        return {
            link: function(scope, element) {
                var ITEM_HEIGHT = 230,
                    VIEWPORT_HEIGHT = element.height();

                scope.$on("snapshot:reload", function(event, isScroll) {
                    if (isScroll) {
                        _scrollToSnapshot();
                    }
                });

                function _scrollToSnapshot() {
                    var current = {},
                        viewport = {},
                        scrollTOP = element.scrollTop(),
                        index = _.findIndex(scope.vm.steps, {key: scope.vm.snapshot.key});

                    current.start = index * ITEM_HEIGHT;
                    current.end = (index + 1) * ITEM_HEIGHT;
                    viewport.start = scrollTOP;
                    viewport.end = scrollTOP + VIEWPORT_HEIGHT;

                    if (current.start < viewport.start) {
                        element.scrollTop(current.start);
                    } else if (current.end > viewport.end) {
                        element.scrollTop(current.end - VIEWPORT_HEIGHT);
                    }
                }


            }
        }
    }

    function tbPluginParameterModel() {
        return {
            require: 'ngModel',
            link: function(scope, element, attrs, ngModelCtrl) {
                ngModelCtrl.$formatters.push(function(value) {
                    return value.split("@").concat([""])[1];
                });

                ngModelCtrl.$parsers.push(function(value) {
                    return ngModelCtrl.$modelValue.split("@")[0] + '@' + value;
                });
            }
        }
    }

    function tbAnchorArea() {
        return {
            link: function(scope, element) {
                var $img = element.parent().siblings("img");

                function _updateSize() {
                    var w = $img.width(),
                        h = $img.height();

                    element.css({
                        left: w * scope.anchor.x + 'px',
                        top: h * scope.anchor.y + 'px',
                        width: w * scope.anchor.w + 'px',
                        height: h * scope.anchor.h + 'px'
                    });
                }

                scope.$watch("anchor", _updateSize);
                scope.$on("snapshot:resize", _updateSize);

            }
        }
    }

    function tbXmlArea() {
        return {
            link: function(scope, element) {
                var $img = element.parent().siblings("img"),
                    deviceScreen = undefined;


                scope.$on("create.xmlLayout", function(e, bounds) {
                    if (bounds) {
                        deviceScreen = bounds;
                        _renderLayoutArea();
                    }
                });

                function _renderLayoutArea() {
                    if (!deviceScreen)return;

                    var w = $img.width(),
                        h = $img.height(),
                        screen = getValue(deviceScreen),
                        ratioX = screen.x2 / w,
                        ratioY = screen.y2 / h,
                        currentLayoutBounds = _.find(scope.vm.layoutProps, function(prop) {
                            return _.keys(prop)[0] == "bounds";
                        })["bounds"],
                        currentLayout = getValue(currentLayoutBounds);

                    element.css({
                        left: currentLayout.x1 / ratioX + 'px',
                        top: currentLayout.y1 / ratioY + 'px',
                        width: (currentLayout.x2 - currentLayout.x1 ) / ratioX + 'px',
                        height: (currentLayout.y2 - currentLayout.y1) / ratioY + 'px'
                    });

                }

                function getValue(bounds) {
                    var v1 = bounds.substring(bounds.indexOf("[") + 1, bounds.indexOf("]")),
                        v2 = bounds.substring(bounds.lastIndexOf("[") + 1, bounds.lastIndexOf("]"));

                    return {
                        x1: v1.split(",")[0],
                        y1: v1.split(",")[1],
                        x2: v2.split(",")[0],
                        y2: v2.split(",")[1]
                    }
                }

                scope.$on("snapshot:resize", _renderLayoutArea);
            }
        }
    }

    function jsonBlock(TestCaseService) {
        return {
            scope: {
                actions: "=",
                block: "=",
                index: "@",
                instance: "="
            },
            link: function(scope, element) {
                delete scope.block.$$hashKey;

                $(element)
                    .attr("id", "jsonBlock-" + (scope.index || "header"))
                    .html(JSON.stringify(scope.block, null, 4))
                    .on("paste", function() {
                        var _self = $(this);
                        setTimeout(function() { // 复制可编辑元素的内容时,有时会把html内容也复制,需要js清除
                            var text = _self.text();
                            _self.empty().text(text);
                        }, 20)
                    })
                    .on("blur", function() {
                        var $this = $(this),
                            parseText;
                        try {
                            parseText = JSON.parse($(this).text());
                        } catch (e) {
                            TestCaseService.alert($this, "此脚本块格式错误!")
                        }

                        // 修改header
                        if (_.isUndefined(scope.index)) {
                            _.extend(scope.block, JSON.parse($(this).text()));
                        }

                        // 修改非空actions
                        if (parseText && scope.instance) {
                            scope.instance.modifyAction(parseText, scope.index);
                        }
                    })
            }
        }
    }

    function tbSnapshotSpliter() {
        return {
            link: function(scope, element) {
                var $contentPanel = $(".snapshot-editor-content").find(".viewport"),
                    $closePanel = $(".xml-json-container");

                element.click(function() {
                    if ($contentPanel.hasClass("full")) {
                        $contentPanel.removeClass("full");
                        $closePanel.removeClass("closed");
                    } else {
                        $contentPanel.addClass("full");
                        $closePanel.addClass("closed");
                    }
                })
            }
        }
    }

    function testcaseUploadScript($q, $rootScope, $state, UploadService, DialogService, TestCaseService, FileService, spinner, TESTCASE_ENUM){
        return{
            link:function(scope, element){
                $(element).on("click", function(){
                    $(element).find("input").click();
                });

                _bindInputFileChange();

                function _bindInputFileChange() {
                    $(element).find("input").on("change", function() {
                        if (!this.files[0]) return;

                        if (element.find("input[type=file]").attr("multiple")) {
                            spinner.show();
                            var files = _.toArray(this.files),
                                testcase,
                                caseName,
                                file,
                                existTestcase,
                                maxVersionTestcase = _.maxBy(scope.vm.testcases.data, 'version'),
                                batchVersion = maxVersionTestcase ? maxVersionTestcase.version + 1 : 1 ;

                            _multipleUpload();
                            function _multipleUpload() {
                                try {
                                    file = files[0];
                                    caseName = file.name.substring(0, file.name.length - ".js".length);
                                    testcase = {
                                        parent_id: scope.vm.model.testCase.id,
                                        name: caseName,
                                        type: 0,
                                        desc: "",
                                        status: TESTCASE_ENUM.status.not_in_recording,
                                        script_status: TESTCASE_ENUM.scriptStatus.none_script,
                                        is_submitted: false
                                    };

                                    existTestcase = _.find(scope.vm.testcases.data, {name: caseName, parent_id: testcase.parent_id});
                                    // 如果导入的脚本名字和当前目录下已有用例名字相同则覆盖该用例,不存在则新建用例
                                    if (existTestcase) {
                                        TestCaseService.getTestCase(existTestcase.id).then(function(testcase) {
                                            _upload(testcase, testcase.script_key);
                                        });
                                    } else {
                                        TestCaseService.addTestCase(scope.vm.appId, testcase).then(function(testcase) {
                                            _upload(testcase);
                                        });
                                    }
                                    function _upload(testcase, name) {
                                        name = name || (_.guid() + '.js');
                                        UploadService.upload(file, name).then(function() {
                                            TestCaseService.refreshSnapshots(testcase.id, name, batchVersion).then(function() {
                                                files.shift();
                                                if (files.length > 0) {
                                                    _multipleUpload();
                                                } else {
                                                    spinner.hide();
                                                    DialogService.alert("批量上传成功!").finally(function() {
                                                        $state.reload();
                                                    });
                                                }
                                            }).catch(function() {
                                                TestCaseService.deleteTestCase(testcase.id).then(function() {
                                                    $state.reload();
                                                })
                                            });
                                        });
                                    }
                                } catch (e) {
                                    spinner.hide();
                                    DialogService.alert("批量上传失败!").finally(function() {
                                        $state.reload();
                                    });
                                }
                            }
                            _resetInputFile("multiple");
                        } else {
                            var file = this.files[0];
                            _validateScriptType(file).then(function() {
                                var scriptKey = scope.vm.model.testCase.script_key || (_.guid() + '.js');
                                UploadService.upload(file, scriptKey).then(function() {
                                    return TestCaseService.refreshSnapshots(scope.vm.model.testCase.id, scriptKey);
                                }, function() {
                                    return DialogService.alert("脚本上传失败!").finally(function() {
                                        return $q.reject({msg: "脚本上传失败!"});
                                    })
                                }).then(function() {
                                    // refreshSnapshots接口返回正确再提示成功!
                                    return DialogService.alert("脚本上传成功!")
                                }).finally(function() {
                                    scope.vm.testCaseDetail(scope.vm.model.testCase).then(function(testcase) {
                                        $rootScope.$broadcast("testCase.onNodeChanged", testcase);
                                    })
                                });
                                _resetInputFile();
                            }, function(data) {
                                DialogService.alert(data.msg).then(function() {
                                    _resetInputFile();
                                });
                            });
                        }

                    }).on("click", function(e) {
                        e.stopPropagation();
                    });
                }

                function _resetInputFile(multiple) {
                    multiple = multiple ?'multiple="multiple"' :'' ;
                    $(element).find("input").remove();
                    $(element).append('<input type="file" class="hide" accept="text/javascript, application/javascript" '+ multiple +'/>');
                    _bindInputFileChange();
                }

                function _validateScriptType(file) {
                    return FileService.readAsJson(file).then(function(scriptJson) {
                        var type = (scriptJson.launcherActivity == "unknown" || _.isEmpty(scriptJson.launcherActivity)) ? "ios" : "android";
                        if (type != scope.$parent.app.type) {
                            return $q.reject({msg: "上传脚本和当前应用不属于同一个系统类型!"});
                        }
                    }).catch(function() {
                        return $q.reject({msg: "脚本错误，上传失败！"});
                    });
                }
            }
        }
    }

    function regexpFormatText() {
        return {
            scope: {
                regexp: "="
            },
            link: function(scope, element) {
                element.addClass("regexp-text");
                scope.$watch("regexp", function(newVal) {
                    var regexpTextStr = newVal.parent_string ? _replace(newVal.parent_string, newVal.reg_exp) : newVal.name;
                    element.html(regexpTextStr);
                });

                function _replace(str, reg) {
                    reg.match(/([^\/]+)?(\(.+\))([^\/]+)?/);
                    var $1 = '(' + RegExp.$1 + ')',
                        $2 = RegExp.$2,
                        $3 = '('+ RegExp.$3 + ')';
                    return str.replace(new RegExp($1 + $2 + $3), function(_, $11, $22, $33){
                        return  $11 + '<span class="red">' + $22 + '</span>' + $33;
                    });
                }
            }
        };
    }

})();