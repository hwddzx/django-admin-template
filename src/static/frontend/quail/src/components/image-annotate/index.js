(function() {

    angular.module("quail.image-annotate", [])
        .directive("tbImageAnnotate", tbImageAnnotate);

    function tbImageAnnotate($http, $timeout, config, UploadService, TaskService, TaskFactoryService, DialogService, spinner) {

        return {
            templateUrl: 'components/image-annotate/image.annotate.html',
            link: function(scope, element, attrs) {
                var tools = {},
                    $canvas = element.find("#dash-canvas"),
                    $brushCanvas = element.find("#brush-canvas"),
                    ctx = $canvas[0].getContext("2d"),
                    brushCtx = $brushCanvas[0].getContext("2d"),
                    $container = element.find(".element-container"),
                    $drawboard = element.find(".draw-board");

                $canvas.attr("width", scope.imageSize.width);
                $canvas.attr("height", scope.imageSize.height);
                $brushCanvas.attr("width", scope.imageSize.width);
                $brushCanvas.attr("height", scope.imageSize.height);

                scope.toolStyleWidths = [2, 4, 8];
                scope.fontSizeItems = [36, 24, 18, 16, 14, 12];
                scope.colorItems = ['#c00', '#ff0', '#090', '#00f', '#fff', '#000', '#999'];
                scope.tools = [];
                scope.btns = [];

                var history = [],
                    action = {};

                $drawboard.on("mousedown", function($e) {
                        action = {};
                        if (scope.activeTool && scope.activeTool.isSharp) {
                            action.start = {
                                x: $e.offsetX,
                                y: $e.offsetY
                            };
                            action.key = scope.activeTool.key;
                            action.props = angular.copy(scope.activeTool.props);
                        }
                    })
                    .on("mousemove", function($e) {
                        if (action.start && scope.activeTool && scope.activeTool.isSharp) {
                            action.before = action.end || action.start;
                            action.end = {
                                x: $e.offsetX,
                                y: $e.offsetY
                            };
                            action.style = {
                                lineWidth: ctx.lineWidth,
                                strokeStyle: ctx.strokeStyle
                            };
                            ctx.clearRect(0, 0, scope.imageSize.width, scope.imageSize.height);
                            ctx.save();
                            angular.forEach(history, function(item) {
                                ctx.lineWidth = item.style.lineWidth;
                                ctx.strokeStyle = item.style.strokeStyle;
                                tools[item.key].draw(item, true);
                            });
                            ctx.restore();
                            scope.activeTool.draw(action);
                        }
                    })
                    .on("mouseup mouseleave", function($e) {
                        if (scope.activeTool && !scope.activeTool.extraCanvas && scope.activeTool.isSharp && action.end) {
                            history.push(action);
                        }
                        action = {};
                    })
                    .on("click", function($e) {
                        if (scope.activeTool && scope.activeTool.click) {
                            scope.activeTool.click.apply(this, arguments);
                        }
                    });


                ctx.lineWidth = 4;
                ctx.strokeStyle = 'blue';
                ctx.fillStyle = ctx.strokeStyle;
                brushCtx.lineWidth = 4;
                brushCtx.strokeStyle = 'blue';

                scope.currentWidth = ctx.lineWidth;
                scope.currentFontSize = 14;
                scope.currentColor = ctx.strokeStyle;
                scope.currentBrushColor = brushCtx.strokeStyle;

                scope.model = {
                    currentChooseTool: 'none', //'none':没有选择工具,'text':文本,'other':其它
                    currentFontSizeIsShow: false,
                    currentColorPanelIsShow: false
                };

                scope.chooseToolStyleWidth = function(width) {
                    scope.currentWidth = width;
                    ctx.lineWidth = width;
                    brushCtx.lineWidth = width;
                };

                scope.chooseFontSize = function(size, $event) {
                    scope.currentFontSize = size;

                    scope.model.currentFontSizeIsShow = false;
                    $event.stopPropagation();
                };

                scope.chooseToolColor = function(color, $event) {
                    scope.currentColor = color;
                    scope.currentBrushColor = color;
                    ctx.strokeStyle = color;
                    brushCtx.strokeStyle = color;

                    scope.model.currentColorPanelIsShow = false;
                    $event.stopPropagation();
                };

                registerTool({
                    icon: 'icon-rectangle',
                    key: 'rectangle',
                    isSharp: true,
                    draw: function(options) {
                        ctx.strokeRect(options.start.x, options.start.y, (options.end.x - options.start.x), (options.end.y - options.start.y));
                    }
                });

                registerTool({
                    icon: 'icon-circle',
                    key: 'circle',
                    isSharp: true,
                    draw: function(options) {
                        var x = (options.end.x + options.start.x) / 2,
                            y = (options.end.y + options.start.y) / 2,
                            w = (options.end.x - options.start.x) / 2,
                            h = (options.end.y - options.start.y) / 2,
                            r = Math.abs((w > h) ? w : h),
                            ratioX = w / r,
                            ratioY = h / r;
                        if (!w || !h) {
                            return;
                        }
                        ctx.save();
                        ctx.scale(ratioX, ratioY);
                        ctx.beginPath();
                        ctx.arc(x / ratioX, y / ratioY, r, 0, 2 * Math.PI, false);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.restore();
                    }
                });

                registerTool({
                    icon: 'icon-arrow',
                    key: 'arrow',
                    isSharp: true,
                    draw: function(options) {
                        var arrowLen = ctx.lineWidth * 6, // 箭头长度
                            arrowToXRad = Math.PI / 6, // 箭头与线之间的弧度
                            tox = options.end.x,
                            toy = options.end.y,
                            fromx = options.start.x,
                            fromy = options.start.y,
                            angle = Math.atan2(toy - fromy, tox - fromx);
                        ctx.beginPath();
                        ctx.moveTo(fromx, fromy);
                        ctx.lineTo(tox, toy);
                        ctx.moveTo(tox - arrowLen * Math.cos(angle - arrowToXRad), toy - arrowLen * Math.sin(angle - arrowToXRad));
                        ctx.lineTo(tox, toy);
                        ctx.lineTo(tox - arrowLen * Math.cos(angle + arrowToXRad), toy - arrowLen * Math.sin(angle + arrowToXRad));
                        ctx.stroke();
                        ctx.closePath();
                    }
                });

                registerTool({
                    icon: 'icon-brush',
                    key: 'brush',
                    isSharp: true,
                    extraCanvas: true,
                    draw: function(options, isRedraw) {
                        brushCtx.beginPath();
                        brushCtx.moveTo(options.before.x, options.before.y);
                        brushCtx.lineTo(options.end.x, options.end.y);
                        brushCtx.stroke();
                    }
                });

                var $currentInput = null,
                    isEditStatus = false;

                // 生成文本框并且绑定拖拽,编辑等事件
                function bindEvent(event) {
                    isEditStatus = false;
                    var $input = $currentInput = $("<div class='text-ipt' contenteditable='true'></div>");
                    $input.css({
                        'left': event.offsetX + 'px',
                        'top': event.offsetY + 'px',
                        'fontSize': scope.currentFontSize,
                        'color': scope.currentColor,
                        'border': '1px solid ' + scope.currentColor
                    });
                    $input = $drawboard.append($input).find($input);

                    $input.focus().draggable({ containment: $drawboard, scroll: false });

                    $input.on("blur", function() {
                        var $this = $(this);
                        if ($this.text() == "") { // 创建的文本框没有内容则删除
                            $this.remove();
                        } else {
                            setTimeout(function() { // 失去焦点实现不可编辑,可拖动
                                if (!isEditStatus) {
                                    $this.attr("contenteditable", "false")
                                        .draggable("enable");
                                }
                            }, 200)
                        }
                    }).on("click", function(e) {
                        e.stopPropagation();
                    }).on("dblclick", function(e) { // 双击实现可编辑,禁止拖动
                        isEditStatus = true;
                        var $this = $(this);
                        $this.draggable("disable")
                            .attr("contenteditable", "true")
                            .css({
                                "border": "1px solid " + scope.currentColor,
                                "color": scope.currentColor
                            });
                        getFocus($this);
                        e.stopPropagation();
                    }).on('keydown', function() {
                        var $this = $(this),
                            parentElementWidth = Number($this.parent().width()),
                            width = Number($this.css("width").split('px')[0]),
                            left = Number($this.css("left").split('px')[0]);

                        if (parentElementWidth - left - width <= 0) { // 输入框右侧未超出截图
                            $this.css("width", width);
                        }
                    }).on("mousedown", function() {
                        var $this = $(this);
                        if ($input.index() != $currentInput.index()) {
                            isEditStatus = false;
                        }
                        $currentInput = $input;
                        if (!isEditStatus) {
                            $this.css("cursor", "move");
                        }

                    }).on("mouseup", function() {
                        var $this = $(this);
                        $this.css("cursor", "default");
                    })
                }

                // 文本框获取焦点,焦点在文本末端
                function getFocus(el) {
                    el = el[0];
                    el.focus();
                    if (document.createRange) {
                        var range = document.createRange();
                        range.selectNodeContents(el);
                        range.collapse(false);
                        var sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);

                    }
                }

                registerTool({
                    icon: 'icon-text',
                    key: 'text',
                    click: function($e) {
                        bindEvent($e);
                    }
                });

                registerBtn({
                    icon: 'icon-editor-cancel',
                    key: 'cancel',
                    click: function() {
                        scope.model.currentChooseTool = 'none';
                        scope.close();
                    }
                });

                // IE下文本换行截图之后显示成一行,需要通过这个此函数hack一下.
                function _textToMultiLine() {
                    var $input = $drawboard.find('.text-ipt'),
                        _html = "";
                    _.each($input, function(currentInput) {
                        var $currentInput = $(currentInput),
                            valueArray = $currentInput.text().split("");
                        _.each(valueArray, function(value) {
                            _html += '<div>' + value + '</div>';
                            $currentInput.html("").append(_html);
                        })
                        _html = "";
                    })
                }

                registerBtn({
                    icon: 'icon-editor-ok',
                    key: 'close',
                    click: function() {
                        _textToMultiLine();
                        scope.model.currentChooseTool = 'none';
                        spinner.show();
                        html2canvas(element.parent()[0], {
                            proxy: "/api/task/html2canvas_proxy/?api_token=" + config.token,
                            onrendered: function(canvas) {
                                var blob = b64toBlob(canvas.toDataURL().split(",")[1]),
                                    key = _getSnapshotKey().replace(".jpg", "") + "_" + (new Date()).getTime() + ".jpg";
                                var domain = null,
                                    imageUrl = null;
                                UploadService.upload(blob, key).then(function(url) {
                                    //imageUrl = url;
                                    return TaskFactoryService.getQiniuToken();
                                }).then(function(tokens) {
                                    domain = tokens.other.domain;
                                    //imageUrl = imageUrl.replace('http://file.lab.tb/', domain); //上传成功后，因为未知原因导致url前缀被固定为了file.lab.tb，暂时强制重新替换一次
                                    imageUrl = domain + key;
                                    return TaskService.saveSnapshotPatch(scope.execution, key, _getSnapshotKey());
                                }).then(function() {
                                    //私有化部署延迟500ms显示标注后的图片
                                    var delay = config.isLab() ? 500 : 0;
                                    $timeout(function () {
                                        scope.snapshot.patch = {
                                            url: imageUrl,
                                            key: key
                                        };
                                        scope.close();
                                        $timeout(function() { //手动触发脏值检查
                                            scope.$digest();
                                        });
                                    }, delay);
                                }).catch(function() {
                                    DialogService.error("保存截图失败!");
                                }).finally(function() {
                                    spinner.hide();
                                });

                                function _getSnapshotKey() {
                                    return scope.snapshot.body ? scope.snapshot.body.name : scope.snapshot.key;
                                }
                            }


                        });

                        function b64toBlob(b64Data, sliceSize) {
                            var contentType = "image/png" || '';
                            sliceSize = sliceSize || 512;

                            var byteCharacters = window.atob(b64Data);
                            var byteArrays = [];

                            for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                                var slice = byteCharacters.slice(offset, offset + sliceSize);

                                var byteNumbers = new Array(slice.length);
                                for (var i = 0; i < slice.length; i++) {
                                    byteNumbers[i] = slice.charCodeAt(i);
                                }

                                var byteArray = new Uint8Array(byteNumbers);

                                byteArrays.push(byteArray);
                            }

                            var blob = new Blob(byteArrays, {
                                type: contentType
                            });
                            return blob;
                        }
                    }
                });

                // 计算样式框位置
                function _toolStylePosition($event) {
                    var $currentTarget = $($event.currentTarget),
                        offset = $currentTarget.offset(),
                        $toolStyle = element.find('.tools-style'),
                        toolStyleToCurrentTargetDistance = 55, // 样式框到工具条的距离
                        left = offset.left - ($toolStyle.width() - $currentTarget.width()) / 2,
                        top = offset.top - $(window).scrollTop() - toolStyleToCurrentTargetDistance;
                    $toolStyle.css({
                        left: left,
                        top: top
                    });
                }

                scope.onToolClicked = function(tool, $event) {

                    if (scope.activeTool !== tool) {
                        if (scope.activeTool) {
                            scope.activeTool.active = false;
                        }
                        scope.model.currentChooseTool = tool.key == 'text' ? 'text' : 'other';
                        tempChooseTool = scope.model.currentChooseTool;
                        scope.activeTool = tool;
                        scope.activeTool.active = true;
                    } else {
                        if (scope.model.currentChooseTool != 'none') {
                            scope.model.currentChooseTool = 'none';
                        } else {
                            scope.model.currentChooseTool = tool.key == 'text' ? 'text' : 'other';
                        }
                    }
                    _toolStylePosition($event);
                };

                function registerTool(tool) {
                    scope.tools.push(tool);
                    tools[tool.key] = tool;
                }

                function registerBtn(btn) {
                    scope.btns.push(btn);
                }

            }
        }

    }


})();
