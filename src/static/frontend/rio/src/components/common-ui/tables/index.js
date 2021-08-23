angular.module("stf.table", [])
    .controller("paginationTableCtrl", paginationTableController)
    .controller("localPaginationTableCtrl", localPaginationTableController)
    .directive("scrollLoadTable", scrollLoadTable);

function paginationTableController($http) {
    var PREV = -1,
        NEXT = 1,
        vm = this;

    vm.count = 0;

    vm.pageSize = 30;

    vm.dataSource = function() {};

    vm.setDataSource = function(dataSource) {
        vm.dataSource = dataSource;
    }

    vm.getDataSource = function() {
        return vm.dataSource;
    }

    vm.onloaded = function() {

    }

    vm.load = function() {
        var dataSource = this.getDataSource(),
            promise = dataSource();
        if (promise) {
            promise.then(this.dataParse);
        }
        return promise;
    }

    //通过url读取
    vm.loadByUrl = function(url) {
        return $http.get(url).then(vm.dataParse);
    }

    vm.loadNextPage = function() {
        return this.paginate(NEXT);
    }

    vm.hasNextPage = function() {
        return this.next;
    }

    vm.hasPrevPage = function() {
        return this.prev;
    }

    vm.getIndex = function(index) {
        return (index + 1 + (this.pageNumber - 1) * vm.pageSize);
    }

    //翻页功能实现
    vm.paginate = function(direction) {
        var url;
        if (vm.prev && (direction == PREV)) {
            url = vm.prev;
        }
        if (vm.next && (direction == NEXT)) {
            url = vm.next;
        }
        if (!url) {
            return;
        }

        //缓存当前页面
        vm.url = url;

        return vm.loadByUrl(url);
    };

    //response的数据解析到tableCtrl
    vm.dataParse = function(res) {
        var prev,
            pageNumber = res.config.url.match(/page=(\d+)/),
            data = res.results ? res : res.data;

        prev = data.prev ? data.prev : data.previous;

        _.extend(vm, {
            count: data.count,
            next: data.next,
            prev: prev,
            data: data.results,
            reload: false
        });
        _setPageCount();

        //http://0.0.0.0:8001/webapi/platformtask/2/testertask/?page=2&page_size=1
        //https://test-pc.testbird.com/webapi/customer/tag/42/tester/?page=3
        vm.pageNumber = pageNumber ? parseInt(pageNumber[1]) : 1;

        vm.onloaded(vm.data);

    }

    //处理总页数
    function _setPageCount() {
        vm.pageCount = vm.count / vm.pageSize;
        if (vm.pageCount == 0) {
            vm.pageCount++;
        } else {
            vm.pageCount = Math.ceil(vm.pageCount);
        };
    };

}

//TODO 需要重写
function localPaginationTableController($q, $timeout) {
    var vm = this;

    vm.pageSize = 30;
    vm.pageNumber = 1;

    vm.load = function() {
        return $q(function(resolve) {
            resolve(vm.getDataSource())
        });
    }

    vm.getDataSource = function() {
        return [];
    }

    vm.loadNextPage = function() {
        return $q(function(resolve) {
            $timeout(function() {
                vm.pageNumber++;
                resolve()
            }, 500);
        })
    }

    vm.isItemShow = function(index) {
        return (index + 1) <= vm.pageSize * vm.pageNumber;
    }

    vm.getWhichPhonePng = function (v) {
        if (v.icon) {
            return v.icon
        } else {
            var iphone_useing = "http://toolsforest.com/yuancheng_img/iphone1.png"
            var iphone_use = "http://toolsforest.com/yuancheng_img/iphone2.png"
            var android_useing = "http://toolsforest.com/yuancheng_img/android1.png"
            var android_use = "http://toolsforest.com/yuancheng_img/android2.png"
            
            if (v.os.toLowerCase().indexOf('ios') > -1) {
                // 安卓
                if (v.status == 0) {
                    return iphone_use
                } else {
                    return iphone_useing
                }
            } else {
                // 苹果
                if (v.status == 0) {
                    return android_use
                } else {
                    return android_useing
                }
            }
        }
    };
    vm.hasNextPage = function() {
        return vm.getDataSource().length > vm.pageNumber * vm.pageSize;
    }

    vm.hasPrevPage = function() {
        return vm.pageNumber > 0;
    }

}

function scrollLoadTable() {

    return {
        restrict: 'A',
        scope: {
            ctrl: '='
        },
        link: function(scope, element) {
            var isloading = false,
                $loadMore = $("<div class='load-more'><a class='btn btn-xs'>load more</a></div>"),
                $loadMoreLink = $loadMore.children("a"),
                $spinner = $("<div class='loading-spinner'></div>"),
                ctrl = scope.ctrl;

            element.after($loadMore);
            element.after($spinner);

            scope.$on("table:reload", function() {
                _loadingWrap(ctrl.load());
            })

            _loadingWrap(ctrl.load());

            $loadMoreLink.click(function() {
                $loadMore.hide();
                _loadingWrap(ctrl.loadNextPage());
            })

            $(window).scroll(_onScroll);

            function _onScroll() {
                if ($(window).scrollTop() + $(window).height() == $(document).height() && !isloading && ctrl.hasNextPage()) {
                    if (ctrl.pageNumber > 1) {
                        _loadingWrap(ctrl.loadNextPage());
                    }
                }
            }

            function _loadingWrap(promise) {
                isloading = true;
                $spinner.show();
                promise.finally(function() {
                    $spinner.hide();
                    isloading = false;
                    if (ctrl.pageNumber == 1 && ctrl.hasNextPage()) {
                        $loadMore.show();
                    }
                })
            }

        }
    }
}
