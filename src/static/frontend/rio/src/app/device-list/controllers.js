// var QueryParser = require('./util/query-parser')
angular.module('device-list').controller('DeviceListCtrl', DeviceListCtrl);

function DeviceListCtrl(
    $scope, $location, $rootScope, $controller, $state, $cookies, $uibModal, RioService, SocketService, CountDownService, GroupService, RentModalService, DialogService, customer, config, sysConfig
) {
    var vm=  this;
    var device_key = "";
    $scope.config = config;

    //’在线咨询窗口‘临时展示
    // document.getElementById("lim_mini").style.display="block";

    $scope.selected_type = "QQ";
    $scope.selected_type_list = {QQ: "QQ号", Email: "电子邮箱", Phone: "联系电话"};


    $scope.currentDevice = null;

    $scope.pageNum = [];
    $scope.deviceList;
    $scope.rentingDevice;
    vm.currentPage = 1;
    $scope.maxSize = 5;
    $scope.filteredResults = {
        page: 1,
        page_size: 16,
    };

    $scope.is_show_reservation = false;

    $scope.customer = customer;

    $scope.sysConfig = sysConfig;

    $scope.bannerUrl = sysConfig['banner.picture.url'];

    $scope.bannerLink = sysConfig['banner.link.url'];

    $scope.banners = sysConfig['banners'];

    $scope.rechargeUrl = config.rechargeUrl;

    $scope.filters = [{
        key: 'manufacturer',
        name: '品牌',
        items: [],
        multSelected: [],
        selected: []
    }, {
        key: 'android',
        name: 'Android',
        items: [],
        multSelected: [],
        selected: []
    }, {
        key: 'harmony',
        name: 'Harmony',
        items: [],
        multSelected: [],
        selected: []
    },{
        key: 'ios',
        name: 'iOS',
        items: [],
        multSelected: [],
        selected: []
    },{
        key: 'resolution',
        name: '分辨率',
        items: [],
        multSelected: [],
        selected: []
    }, {
        key: 'status',
        name: '状态',
        items: [],
        multSelected: [],
        selected: []
    }];

    $scope.showDescription = function(message) {
        DialogService.alert(message);
    };

    $scope.fieldFilters = function(rioDevice) {
        var isAllFilterMath = true;
        angular.forEach($scope.filters, function(filter) {
            var isFileterMatch = true;
            if (filter.selected.length) {
                isFileterMatch = _.find(filter.selected, function(selectItem) {
                    return rioDevice[filter.key] === selectItem.value;
                });
            }
            isAllFilterMath = isAllFilterMath && isFileterMatch;
        })
        return isAllFilterMath;
    }

    $scope.isDeviceAvailable = RioService.isDeviceAvailable;

    $scope.deviceStatusText = function(device) {
        switch (device.status) {
            case 0:
                if (!device.health) {
                    return "4:不健康";
                } else {
                    return "0:空闲";
                }
            case 1:
                return "1:忙碌";
            case 3:
                return "3:维护中";
        }
    }

    $scope.setCurrentDevice = function(device) {
        $scope.currentDevice = device;
    }

    $scope.showRentModal = function(device) {
        if (!$scope.customer.is_free_user) {
            window.localStorage.deviceType = /ios/i.test(device.os) ? 'ios' : 'android';
            RioService.showRentModal(device);
        }
    }

    $scope.paid = function () {
        location.href = location.href.indexOf('stage') > -1 ? "http://stage-dt.testbird.com/home/order?next_url=new_home/index.html" : "http://dt.testbird.com/home/order?next_url=new_home/index.html";
    }

    // 展示预约框
    $scope.showReservationModel = function(device) {
        console.log('device');
        console.log(device);
        device_key = device.key;
        $scope.is_show_reservation = true;
        $('.fill-height').css('overflow','hidden')
    }
    // 预约
    $scope.yysj = function(device) {
        console.log('$scope.numbers and lxtype')
        console.log($('#selects').val())
        console.log($('#input_number').val())
        console.log(device);
        //  请求
        if(!$('#input_number').val()){
            DialogService.alert("输入信息不能为空");
            return;
        }
        $.post('/api/rio/rent/subscribe/', { method: $('#selects').val(), number: $('#input_number').val(), device: device_key }, function (res) {
            console.log(res);
            DialogService.alert("预约成功");
            $('#selects').val("");
            $('#input_number').val("");
            $scope.is_show_reservation = false;
            $('.fill-height').css('overflow','scroll');
            setTimeout(function(){
                history.go(0);
            }, 2000);
        })
    }

    $scope.Hideyysj = function(){
        $scope.is_show_reservation = false;
        $('.fill-height').css('overflow','scroll')

    }
    

    $scope.recharge = function() {
        $state.go("finance.order");
    }

    $scope.loadRentInfo = function(device) {
        window.localStorage.deviceType = /ios/i.test(device.os) ? 'ios' : 'android';
        RioService.gotoDevicePage(device);
    }

    $scope.rentByFreeUser = function() {
        //试用设备 默认时间为30分钟
        RioService.gotoDevicePage({
            key: 'free'
        }, 30);
    }

    $scope.tableCtrl = $controller("localPaginationTableCtrl");

    $scope.tableCtrl.getDataSource = function() {
        return $scope.results;
    }

    $scope.$watch('results', function(newValue, oldValue) {
        if (newValue) {
            $scope.tableCtrl.pageNumber = 1;
            $scope.$broadcast("table:reload");
        }
    })

    $scope.$on('searchFiltersForDevives',function(event,data){
        data.page = 1;
        $scope.filteredResults = data;
        fetchDevices(data);
    })
    
    $scope.searchWD = function(e) {
        var keycode = window.event ? e.keyCode : e.which;
        if (keycode == 13 || e == '13') {
            $scope.filteredResults.wd = $scope.keywords;
            fetchDevices($scope.filteredResults)
        }
    }

    fetchDevices($scope.filteredResults);
    function fetchDevices(params){
        RioService.fetchDevices(params).then(function(val) {
            $scope.deviceList = val.results;

            $scope.bigTotalItems = val.count;
        });
    }
    $scope.pageChanged = function () {
        $scope.filteredResults.page = $scope.bigCurrentPage
        fetchDevices($scope.filteredResults);
    };

    fetchFiltersLists();
    function fetchFiltersLists(){
        RioService.fetchSearchLists().then(function(val) {
            val.resolution = [];
            val.status = ['空闲','离线','租用中','热门租用机型'];
            val.android = val.os.android;
            val.harmony = val.os.harmony;
            val.ios = val.os.ios;
            
            val.manufacturer = _.filter(val.manufacturer,function(o){return o != null})
            // val.manufacturer = val.manufacturer.sort((a,b) => a.charCodeAt(0) - b.charCodeAt(0));
            val.manufacturer = val.manufacturer.sort(function (a, b) {
                return a.charCodeAt(0) - b.charCodeAt(0);
            });
            val.manufacturer = val.manufacturer.sort(
                function compareFunction(params1,params2){
                    return params1.localeCompare(params2,"zh");
                }
            )
            
            angular.forEach(val.screen,function(resolu){
                val.resolution.push(resolu[0] + 'x' + resolu[1]);
            })

            val.android.sort(compare());
            val.harmony.sort(compare());
            val.ios.sort(compare());
            val.resolution.sort(compare());

            angular.forEach($scope.filters, function(filter) {
                var fieldVal = val[filter.key];
                if (!filter.cache) {
                    filter.cache = {};
                }
                if (fieldVal !== undefined && !filter.cache[fieldVal]) {
                    filter.cache[fieldVal] = true;
                    angular.forEach(fieldVal,function(fval){
                        filter.items.push({
                            value: fval,
                            top: true
                        });
                    })
                }
            });
        });
    }

    function compare() {
        return function (m, n) {
            var a = m;
            var b = n;
            return b.localeCompare(a, 'zh-CN', {
                numeric: true
            });
        }
    }

    fetchRentingDeviceLists();
    function fetchRentingDeviceLists(){
        RioService.fetchRentingDeviceLists().then(function(val){
            $scope.rentingDevice =  val;
        })
    }

    _activate();

    function _activate() {

        // angular.forEach($scope.devices.mine.concat($scope.devices.other), function(device) {
        //     device['resolution'] = device.screen_width + 'x' + device.screen_length;
        //     angular.forEach($scope.filters, function(filter) {
        //         var fieldVal = device[filter.key];
        //         if (!filter.cache) {
        //             filter.cache = {};
        //         }
        //         if (fieldVal !== undefined && !filter.cache[fieldVal]) {
        //             filter.cache[fieldVal] = true;
        //             filter.items.push({
        //                 value: fieldVal,
        //                 top: true
        //             });
        //         }
        //     });
        // });

        var comptestDeviceName = config.device_name;

        if (comptestDeviceName) {
            //清除cookie,防止从dt再次打开rio时共用此cookie,导致新的rio窗口再次弹出ct租用界面
            $cookies.remove("site_profile",{ path: '/' });
            RioService.getComptestPayDetail(comptestDeviceName).then(function(message) {
                _showReportRentModal(message, comptestDeviceName);
            });
        }


        var SAFE_RECORD_KEY = 'safeTipsRecord',
            localeDateStr = (new Date()).toLocaleDateString(),
            safeTipsRecord = localStorage.getItem(SAFE_RECORD_KEY),
            safeTipsRecord = safeTipsRecord ? JSON.parse(localStorage.getItem(SAFE_RECORD_KEY)) : {
                count: 0
            };

        //localStorage记录修改的日期，同一天只显示一次
        if (safeTipsRecord.count < 3 && safeTipsRecord.date !== localeDateStr) {
            safeTipsRecord.count++;
            safeTipsRecord.date = localeDateStr;
            localStorage.setItem(SAFE_RECORD_KEY, JSON.stringify(safeTipsRecord));
            _showSafeModal();
        }
    }

    function _showSafeModal() {
        $uibModal.open({
            templateUrl: 'app/device-list/templates/safe-modal.html',
            size: 'lg',
            backdrop: 'static',
            controller: function($uibModalInstance, $scope) {
                $scope.close = function() {
                    $uibModalInstance.close();
                }
            }
        });
    }
    // 客服
    function kf(){
        function async_load(src) {
            var s = document.createElement('script');
            s.type = 'text/javascript';
            s.async = true;
            s.src = src;
            // var x = document.getElementsByTagName('script')[0];
            // x.parentNode.insertBefore(s, x);
    
            // document.getElementsByTagName('head')[0].appendChild(s);
            if(document.getElementById("lim_mini")){
                document.getElementById("lim_mini").style.display="block";
            }
            document.body.appendChild(s);
        };
            //如果只有monitor.js，就替换monitor.js这个完整js的url(将另外一个js给注释掉)，如果两个js都有，那就都替换
            //async_load("https://chat8.live800.com/live800/chatClient/floatButton.js?jid=1091048728&companyID=152592&configID=150013&codeType=custom&ss=1&delayload=1");
            async_load("https://chat.live800.com/live800/chatClient/monitor.js?jid=9932796806&companyID=758788&configID=126453&codeType=custom&ss=1&delayload=1");
            // delayload=1  这个参数不能删除，替换的只是http:..............custom 这部分
            //如果是https的话 相应的就是替换https：...........custom这部分  delayload=1  不删除
    }
    kf();
    function _showReportRentModal(message, comptestDeviceName) {
        if (config.releaseEnv != "lab") {
            var $uibModalInstance = $uibModal.open({
                templateUrl: 'app/device-list/templates/report-rent-modal.html',
                size: 'lg',
                backdrop: 'static',
                controller: function($uibModalInstance, $scope, $state, config) {
                    $scope.rechargeUrl = config.rechargeUrl;
                    $scope.message = message;
                    $scope.cancel = function() {
                        window.close();
                    }
                    $scope.close = function() {
                        $uibModalInstance.close();
                    }
                    $scope.rent = _rentDevice;
                }
            })
        } else {
            _rentDevice();
        }

        function _rentDevice() {
            RioService.rentFromComptest(comptestDeviceName).then(function (key) {
                $state.go("device", {
                    key: key
                }, {
                    reload: true
                });
            }).catch(function (rejection) {
                $scope.errorMsg = rejection.data.errorMsg;
            })
        }

    }

}
