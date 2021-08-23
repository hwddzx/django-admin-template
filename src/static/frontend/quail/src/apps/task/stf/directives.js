(function() {
    angular.module('control-panes')
        .directive("snapshotResize", snapshotResize)
        .directive("inputTextDialog", inputTextDialog)
        .directive("kfButtonCheck", kfButtonCheckDirective)
        .directive("tbAccordion", tbAccordion);


    function snapshotResize() {
        return {
            link: function(scope, element) {
                element.click(function() {
                    if (!scope.shot.patch) {
                        element.css("max-height", element.height());
                        element.parent().height(element.height());
                    }
                })
            }
        };
    }

    function inputTextDialog(SocketService) {
        return {
            templateUrl: 'apps/task/stf/templates/input.text.html',
            link: function(scope, element, attrs) {

                var input = element.find('textarea');

                scope.$on("device:apply", function() {
                    SocketService.getSocket().on("IME.on", _imeListener);
                    SocketService.getSocket().on("ime", _imeListener);
                    SocketService.getSocket().on("device.ime", _imeListener);

                    scope.$on("inputTextDialog", function(name, res){
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
    }

    function kfButtonCheckDirective() {
        return {
            link: function(scope) {
                var $kfButton = $("#kf5-support-btn");
                $kfButton.css({
                    display: "none"
                });
                scope.$on("$destroy", function() {
                    $kfButton.css({
                        display: "block"
                    });
                });
            }
        }
    }

    function tbAccordion() {
        return {
            link: function(scope, element, attrs) {

                scope.$on("reset:accordion", function() {
                    var panelCount = element.children('.accordion-panel').length;
                    if (panelCount > 1) {
                        var $testCasePanel = element.children().eq(0),
                            $executionPanel = element.children().eq(1);
                        $testCasePanel.removeClass('full-expand').removeClass('half-expand');
                        $executionPanel.removeClass('half-expand').addClass('full-expand');
                    }
                });

                element.on('click', '.panel-heading', function() {
                    var panelCount = element.children('.accordion-panel').length;
                    if (panelCount > 1) {
                        var $header = $(this),
                            $panel = $header.parent(),
                            $sibling = $panel.siblings();

                        if ($panel.hasClass('full-expand')) {
                            $panel.removeClass('full-expand');
                            $sibling.addClass('full-expand');
                        } else if ($panel.hasClass('half-expand')) {
                            $panel.removeClass('half-expand');
                            $sibling.removeClass('half-expand').addClass('full-expand');
                        } else {
                            $panel.addClass('half-expand');
                            $sibling.removeClass('full-expand').addClass('half-expand');
                        }
                    }
                });

                element.on('click', '.panel-heading .btn', function(event) {
                    event.stopPropagation();
                });
            }
        }
    }

})();
