$(function(){
    var guideIndex = 0,
        elementArr = [],
        elementPos = null,
        needHack = true;
        $body = $('body');

    //创建遮罩层
    function createOverlay() {
        var jqObj = $('.guide-overlay');
        if (jqObj.length <= 0) {//生成或重新生成引导时重置变量
            if ($body.height() >= 660) {
                $body.addClass('body-overflow-hidden');
            }
            elementArr = [];
            $body.append('<div class="guide-overlay"></div>');
        }
        return jqObj;
    }

    //创建关闭按钮
    function createCloseBtn() {
        var jqObj = $('.close-guide');
        if (jqObj.length <= 0) {
            $body.find('.guide-overlay').append('<span class="close-guide"></span>');
        }
        return jqObj;
    }

    //创建和显示元素一样大小的白底元素
    function createHelperLayer() {
        var className = 'helperLayer' + guideIndex,
            jqObj = $('.' + className);
        if (jqObj.length <= 0) {
            $body.append('<div class="guide-helperLayer ' + className + '"></div>');
        }
        return $('.' + className);
    }

    //创建最上层的透明层，让高亮的节点可见不可操作
    function createToolTip() {
        var className = 'tootip' + guideIndex,
            jqObj = $('.' + className);
        if (jqObj.length <= 0) {
            $body.append('<div class="tooltipReferenceLayer ' + className + '"></div>');
        }
        return $('.' + className);
    }

    //创建css3向外扩散样式，并且可点击按钮
    function createSpreadBtn(pos) {
        var className = 'spreadBtn' + guideIndex,
            parentName = 'spreadBtnParent' + guideIndex,
            jqObj = $('.' + className);
        if (jqObj.length <= 0) {
            $body.append('<div class="spread-btn-parent ' + parentName + '"><div class="spread-btn-pre"></div><div data-position=' + pos + ' data-guideIndex=' + guideIndex + ' class="spread-btn ' + className + '"><i class="guide-icon-btn"><i></div></div>');
        }
        return {'parent': $('.' + parentName), 'spreadBtn': $('.' + className)};
    }

    //创建面板
    function createPanel() {
        var className = 'panel' + guideIndex,
            jqObj = $('.' + className);
        if (jqObj.length <= 0) {
            createHelperLayer().append('<div class="tootip-panel ' + className + '"><div class="arrow"></div></div>');
        }
        return $('.' + className);

    }

    function getPropValue(element, propName) {
        var propValue = '';
        if (element.currentStyle) { //IE
            propValue = element.currentStyle[propName];
        } else if (document.defaultView && document.defaultView.getComputedStyle) { //Others
            propValue = document.defaultView.getComputedStyle(element, null).getPropertyValue(propName);
        }

        //Prevent exception in IE
        if (propValue && propValue.toLowerCase) {
            return propValue.toLowerCase();
        } else {
            return propValue;
        }
    }

    function getOffset(element) {
        var elementPosition = {};

        //set width
        elementPosition.width = element.offsetWidth;

        //set height
        elementPosition.height = element.offsetHeight;

        //calculate element top and left
        var _x = 0;
        var _y = 0;
        while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
            _x += element.offsetLeft;
            _y += element.offsetTop;
            element = element.offsetParent;
        }
        //set top
        elementPosition.top = _y;
        //set left
        elementPosition.left = _x;

        return elementPosition;
    }

    /**
     *@method showGuide 高亮节点
     *@param {string} jquery选择器
     *@return {类数组} jquery对象
     */
    function showGuide (ele) {
        createOverlay();
        createCloseBtn();

        var $ele = $(ele),
            element = $ele[0];

        $ele.addClass('introjs-showElement').attr('data-guideIndex', guideIndex);
        if ($ele.css('position') == "static") {
            $ele.css('position', 'relative');
        }
        var parentElm = element.parentNode;
        while (parentElm != null) {
            if (parentElm.tagName.toLowerCase() === 'body') break;

            var zIndex = getPropValue(parentElm, 'z-index');
            var opacity = parseFloat(getPropValue(parentElm, 'opacity'));
            var transform = getPropValue(parentElm, 'transform') || getPropValue(parentElm, '-webkit-transform') || getPropValue(parentElm, '-moz-transform') || getPropValue(parentElm, '-ms-transform') || getPropValue(parentElm, '-o-transform');
            if (/[0-9]+/.test(zIndex) || opacity < 1 || transform !== 'none') {
                parentElm.className += ' guide-fixParent';
            }
            parentElm = parentElm.parentNode;
        }
        var $helperLayer = createHelperLayer(),
            $toolTip = createToolTip(),
            $tootipPanel = createPanel(),
            $spreadBtn = createSpreadBtn($ele.attr('data-position'));
        elementArr.push({
            'element': element,
            'helperLayer': $helperLayer,
            'toolTip': $toolTip,
            'panel': $tootipPanel,
            'position': $ele.attr('data-position'),
            '$spreadBtn': $spreadBtn.spreadBtn,
            '$spreadBtnParent': $spreadBtn.parent
        });

        elementPos = getOffset(element);
        $helperLayer.css({
            'position': 'absolute',
            'top': elementPos.top,
            'left': elementPos.left,
            'width': elementPos.width,
            'height': elementPos.height
        });
        $toolTip.css({
            'top': elementPos.top,
            'left': elementPos.left,
            'width': elementPos.width,
            'height': elementPos.height
        });

        tootipPanel($tootipPanel, $spreadBtn.parent, elementPos, $ele.attr('data-position'));
        // 引导生成顺序为(guideIndex） 1,4,2,3
        if (guideIndex == 3) { // 最后一个引导生成之后再removeClass
            $body.removeClass('body-overflow-hidden');
            hasScrollMode();
        }
        return $tootipPanel;
    }

    /*
     *取自 UnderscoreJS 实用框架,防止resize高频触发
     */
    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    // 添加resize的回调函数，但是只允许它每300毫秒执行一次
    window.addEventListener('resize', debounce(function (event) {
        refresh();
        needHack = false;
        hasScrollMode();
    }, 300));

    /**
     *刷新辅助层和panel的位置
     **/
    function refresh() {
        var temp = null;
        for (var i = 0; i < elementArr.length; i++) {
            temp = elementArr[i];
            var elementPos = getOffset(temp.element);
            temp.helperLayer.css({
                'position': 'absolute',
                'top': elementPos.top,
                'left': elementPos.left,
                'width': elementPos.width,
                'height': elementPos.height
            });
            temp.toolTip.css({
                'top': elementPos.top,
                'left': elementPos.left,
                'width': elementPos.width,
                'height': elementPos.height
            });
            tootipPanel(temp.panel, temp.$spreadBtnParent, elementPos, temp.position, temp.$spreadBtn);
        }
    }

    /**
     *@method tootipPanel 计算提示面板的位置
     *@param panel {类array} 创建的panel元素的jq对象
     *@param spreadBtnParent {类array} 创建的点击显示隐藏panel的按钮对象的父元素
     *@param elementPos {object}高亮节点的top left height width属性
     *@param tooTipPos {类array} jquery对象,提示面板元素
     *@param spreadBtn {触发面板隐藏显示的btn}
     **/
    function tootipPanel(panel, $spreadBtnParent, elementPos, tooTipPos, $spreadBtn) {
        var $tootipPanel = panel,
            isShow = false,
            $arrow = $tootipPanel.find('.arrow'),
            w = $tootipPanel.width(),
            h = $tootipPanel.height(),
            arrowW = $arrow.width(),
            arrowH = $arrow.height(),
            spreadBtnParentW = $spreadBtnParent.width(),
            spreadBtnParentH = $spreadBtnParent.height(),
            arrowBorderWidth = $arrow.css('borderTopWidth'),
            margin = 30,
            btnMargin = 25,
            moveDistance = 0;
        if ($spreadBtn && $spreadBtn.length > 0) {
            isShow = $spreadBtn.hasClass('panel-show');
        }
        if (isShow) {
            moveDistance = 0;
        } else {
            moveDistance = 50;
        }
        arrowSqrt = Math.sqrt(Math.pow(arrowW, 2) + Math.pow(arrowH, 2));

        arrowBorderWidth = Number(arrowBorderWidth.substring(0, arrowBorderWidth.length - 2));

        switch (tooTipPos) {
            case 'top':
                $tootipPanel.css({
                    'top': - h - arrowBorderWidth - margin - moveDistance,
                    'left': Math.round((elementPos.width - w) / 2)
                });
                $arrow.addClass('top').css({'top': h, 'left': w / 2 - arrowBorderWidth});
                $spreadBtnParent.css({
                    'top': elementPos.top - btnMargin,
                    'left': elementPos.left + elementPos.width / 2 - spreadBtnParentW / 2
                });
                break;
            case 'right':
                $tootipPanel.css({
                    'top': - Math.round((h - elementPos.height) / 2),
                    'left': elementPos.width + arrowBorderWidth + margin + moveDistance
                });
                $arrow.addClass('right').css({'top': h / 2 - arrowBorderWidth, 'left': -2 * arrowBorderWidth});
                $spreadBtnParent.css({
                    'top': elementPos.top + elementPos.height / 2 - spreadBtnParentH / 2,
                    'left': elementPos.left + elementPos.width - spreadBtnParentW / 2
                });
                break;
            case 'left':
                $tootipPanel.css({
                    'top': - Math.round((h - elementPos.height) / 2),
                    'left': - w - arrowBorderWidth - margin - moveDistance
                });
                $arrow.addClass('left').css({'top': h / 2 - arrowBorderWidth, 'left': w});
                $spreadBtnParent.css({
                    'top': elementPos.top + elementPos.height / 2 - spreadBtnParentH / 2,
                    'left': elementPos.left - spreadBtnParentW / 2
                });
                break;
            case 'bottom':
            default:
                $tootipPanel.css({
                    'top': elementPos.height + arrowBorderWidth + margin + moveDistance,
                    'left': Math.round((elementPos.width - w) / 2)
                });
                $arrow.addClass('bottom').css({'top': -2 * arrowBorderWidth, 'left': w / 2 - arrowBorderWidth});
                $spreadBtnParent.css({
                    'top': elementPos.top + elementPos.height - btnMargin,
                    'left': elementPos.left + elementPos.width / 2 - spreadBtnParentW / 2
                });
                break;
        }
    }

    // control-panels/directive.js中,body高度小于660时，因为引导层已经生成之后再加class，导致第2个引导错位，所以需要这段js进行修复
    function hasScrollMode() {
        if (needHack && $body.height() < 660) { // 只有在第一次生成引导并且body高度小于660时进入引导才需要处理。resize窗口，重新生成引导不要处理。
            $body.addClass("guide-scroll-model");
        } else {
            $body.removeClass("guide-scroll-model");
        }
    }
    //关闭引导
    function closeGuide() {
        if ($body.find('.guide-overlay').length > 0) {
            $body.find('.guide-rent-time').removeClass('guide-rent-time');// 因为header租用时间看不清楚，特殊处理下
            $body.find('.guide-overlay').remove();
            $body.find('.guide-helperLayer').remove();
            $body.find('.tooltipReferenceLayer').remove();
            $body.find('.spread-btn-parent').remove();
            $body.find('.introjs-showElement').removeClass('introjs-showElement');
        }
    }

    //按钮关闭事件
    $body.on('click.closeGuide', '.close-guide', function () {
        closeGuide();
    })

    var date1 = 0,
        panelAnimateTime = 300;
    //显示隐藏面板
    $body.on('click.transform', '.spread-btn', function () {

        localStorage.setItem('isShowedGuide', 'true');//查看了引导内容之后，再次租用手机默认不再显示引导

        var date2 = new Date().getTime();
        if ((date2 - date1) > panelAnimateTime) { //用户 panelAnimateTime ms才能执行一次有效点击
            date1 = date2;
            var $this = $(this);
            var index = $this.attr('data-guideIndex'),
                $panel = $('.panel' + index),
                temp = null,
                position = $this.attr('data-position');
            if ($this.hasClass('panel-show')) {
                $this.removeClass('panel-show').removeClass('click-show-panel').addClass('click-hide-panel');
                switch (position) {
                    case 'top':
                        temp = $panel.css('top');
                        temp = Number(temp.substring(0, temp.length - 2));
                        $panel.animate({'top': temp - 50 + 'px', 'opacity': '0'}, panelAnimateTime);
                        break;
                    case 'right':
                        temp = $panel.css('left');
                        temp = Number(temp.substring(0, temp.length - 2));
                        $panel.animate({'left': temp + 50 + 'px', 'opacity': '0'}, panelAnimateTime);
                        break;
                    case 'left':
                        temp = $panel.css('left');
                        temp = Number(temp.substring(0, temp.length - 2));
                        $panel.animate({'left': temp - 50 + 'px', 'opacity': '0'}, panelAnimateTime);
                        break;
                    case 'bottom':
                    default:
                        temp = $panel.css('top');
                        temp = Number(temp.substring(0, temp.length - 2));
                        $panel.animate({'top': temp + 50 + 'px', 'opacity': '0'}, panelAnimateTime);
                        break;
                }
            } else {
                setTimeout(function(){
                        $body.find('.panel-show').not($this).click();
                },panelAnimateTime)
                $this.addClass('panel-show').addClass('click-show-panel').removeClass('click-hide-panel').siblings('.spread-btn-pre').remove();
                switch (position) {
                    case 'top':
                        temp = $panel.css('top');
                        temp = Number(temp.substring(0, temp.length - 2));
                        $panel.animate({'top': temp + 50 + 'px', 'opacity': '1'}, panelAnimateTime);
                        break;
                    case 'right':
                        temp = $panel.css('left');
                        temp = Number(temp.substring(0, temp.length - 2));
                        $panel.animate({'left': temp - 50 + 'px', 'opacity': '1'}, panelAnimateTime);
                        break;
                    case 'left':
                        temp = $panel.css('left');
                        temp = Number(temp.substring(0, temp.length - 2));
                        $panel.animate({'left': temp + 50 + 'px', 'opacity': '1'}, panelAnimateTime);
                        break;
                    case 'bottom':
                    default:
                        temp = $panel.css('top');
                        temp = Number(temp.substring(0, temp.length - 2));
                        $panel.animate({'top': temp - 50 + 'px', 'opacity': '1'}, panelAnimateTime);
                        break;
                }
            }
        }
    })
     $.fn.extend({
        showGuide:function(){
            guideIndex = $(this).attr('data-guide-index');
            return showGuide($(this));
        },
        closeGuide : function(){
            closeGuide();
        }
    });
});