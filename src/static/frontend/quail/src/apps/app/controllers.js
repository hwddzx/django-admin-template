(function() {
    angular.module('quail.app')
        .controller('AppsCtrl', AppsController)
        .controller('AppCtrl', AppController)
        .controller('MonitorCtrl', MonitorController)
        .controller('deviceStfCtrl', deviceStfCtrl)
        .controller('PerformanceComparisonCtrl', PerformanceComparisonCtrl)
        .controller('SelectReportCtrl', SelectReportCtrl)
        .controller('CreateCompareReportCtrl', CreateCompareReportCtrl)
        .controller('PerformanceComparisonDetailCtrl', PerformanceComparisonDetailCtrl)
        .controller('TasksGatherCtrl', TasksGatherCtrl)
        .constant("featureRouteMap", {
            'task.comptest': 'app.comptesttasks',
            'task.replay': 'app.replaytasks',
            'task.manual': 'app.tasks',
            'testcase': 'app.testcases',
            'release': 'app.releases',
            'report': 'app.reports',
            'distribute': 'app.distribute',
            'scan': 'app.scan'
        });

    function AppsController($scope, $state, $stateParams, $q, AppService, ReleaseService, DialogService, TbAppInfoFix, appsProgress, apps, allCustomer, customers, config, TbMd5, TESTCASE_ENUM) {
        $scope.appsProgress = appsProgress;
        $scope.apps = apps;
        $scope.allCustomer = allCustomer;
        $scope.customers = customers;
        $scope.completionStatus = TESTCASE_ENUM.completionStatus;
        $scope.isSigning = false;
        $scope.isManager = config.is_manager; // is_manager具备权限管理相关所有权限
        $scope.isSupervisor = config.is_supervisor; // is_supervisor具备权限管理除开人员配置的其它所欲权限
        $scope.tabType = $stateParams.tabType || (($scope.isManager || $scope.isSupervisor) ? 0 : 1); // 0:项目进度 1:应用测试
        $scope.searches = {}; //项目进度过滤查询条件
        $scope.date = {name: "周", value: 7};
        $scope.selectedDate = {name: "周", value: 7};
        $scope.dates = [
            {name: "天", value: 1},
            {name: "周", value: 7},
            {name: "月", value: 30},
            {name: "季", value: 90},
            {name: "年", value: 365}
        ];
        $scope.isShowSearchPannel = false;
        $scope.search = {
            email: ""
        };

        $scope.format = "yyyy-MM-dd HH";
        $scope.altInputFormats = ['yyyy-MM-dd HH'];
        $scope.startPopup = {
            opened: false,
            date: _getDate().start_date
        };
        $scope.endPopup = {
            opened: false,
            date: _getDate().end_date
        };
        $scope.signObj = {};

        $scope.inputFilter = inputFilter;
        $scope.gotoAppDetail = gotoAppDetail;
        $scope.beforeUpload = beforeUpload;
        $scope.onFileUploaded = onFileUploaded;
        $scope.chooseTab = chooseTab;
        $scope.chooseDate = chooseDate;
        $scope.getAppsProgress = getAppsProgress;
        $scope.sortApp = sortApp;
        $scope.openDatePicker = openDatePicker;
        $scope.addCustomer = addCustomer;
        $scope.addCustomers = addCustomers;
        $scope.deleteCustomer = deleteCustomer;
        $scope.searchEmailChange = searchEmailChange;
        $scope.chooseSearchEmail = chooseSearchEmail;

        function inputFilter(value, key) {
            if (value) {
                $scope.searches[key] = value;
            } else {
                delete $scope.searches[key];
            }
        }

        function gotoAppDetail(app, role) {
            localStorage.setItem("role", role);
            $state.go('app.testcases', { key: app.key})
        }

        $scope.deleteApp = function(event, id){
            event.stopPropagation();

            DialogService.confirm({
                title: "删除应用",
                message: "所用与应用相关的数据将被删除,确定要删除该应用吗?",
                sureText: "删除",
                type: DialogService.DIALOG_TYPE.CONFIRM_WARNING
            }).then(function() {
                AppService.deleteApp(id).then(function() {
                    $state.go('apps', {tabType: 1}, {reload:true});
                });
            });
        };

        function beforeUpload(uploadApp) {
            TbAppInfoFix.fixPackageName(uploadApp);
            return AppService.getAppList({package_name: uploadApp.package_name, type: uploadApp.type}).then(function(data) {
                // 重签名后应用package_name一样，需要根据name字段再
                return _.find(data.mine, {name: uploadApp.name}) ? "该应用已经存在!" : "";
            })
        }

        function onFileUploaded(data) {
            var app = data.app,
                release = data.release,
                promise = $q.when(),
                uuid = release.download_url.match(/[a-z0-9]{32}/ig),
                params;

            // 添加了签名文件
            if (data.uploadApkType !== "withEspresso" && data.uploadApkType !== "withRpkFile" && !_.isUndefined(release.signType)) {
                $scope.signObj = {msg: "app重签名中,请等待...", signing: true};
                promise = AppService.resignApp(release).then(function(data) {
                    release.download_url = data.resignedApkUrl;
                    release.espresso_apk_url = data.espressoApkUrl;
                }).finally(function() {
                    $scope.signObj = {signing: false};
                });
            }

            // 添加了辅助包
            if(data.uploadApkType == "withEspresso"){
                params = {
                    signType: 2, // 1为testbird签名,2为辅助包签名信息校验
                    download_url: release.download_url,
                    espresso_apk_url: release.espresso_apk_url
                };
                $scope.signObj = {msg: "app重签名信息校验中,请等待...", signing: true};
                promise = AppService.resignApp(params).then(function(data) {
                    release.download_url = data.resignedApkUrl;
                    release.espresso_apk_url = data.espressoApkUrl;
                }).finally(function() {
                    $scope.signObj = {signing: false};
                });
            }

            return promise.then(function() {
                // 取上传app文件名第一个uuid作为key
                app.key = uuid[0];
                return AppService.saveApp(app);
            }).then(function(app) {
                // 取上传app文件名第二个uuid作为key
                release.key = uuid[1];
                return ReleaseService.saveRelease(app.key, release);
            }).then(function() {
                $state.go("apps", {tabType: 1}, {reload:true});
            });
        }

        function chooseTab(type) {
            $scope.tabType = type;

            if (type == 0) {
                $scope.searches = {};
                $scope.getAppsProgress();
            } else if (type == 1) {
                AppService.getAppList().then(function(apps) {
                    $scope.apps = apps;
                })
            } else if (type == 2) {
                AppService.getCustomerList().then(function(customers) {
                    $scope.customers = customers;
                    _setCustomerChecked();
                });
            } else if (type == 3) {
                $scope.$broadcast("chooseMonitor");
            }
        }

        $scope.isShowTasks = function() {
            if (config.customer == 'GUANGFA') {
                return $scope.isManager;
            } else {
                return false;
            }
        }

        $scope.isShowMonitor = function() {
            return _.includes(config.features, TbMd5.soar(config.features && config.features[0], 'monitor'));
        }

        $scope.isShowPerformance = function() {
            return _.includes(config.features, TbMd5.soar(config.features && config.features[0], 'performance.compare'));
        }

        function chooseDate(date) {
            $scope.date = date;

            $scope.startPopup.date = _getDate().start_date;
            $scope.endPopup.date = _getDate().end_date;
        }

        // 这儿的时间(date类型)是用来在界面上显示
        function _getDate() {
            return {
                start_date: new Date(new Date().getTime() - $scope.date.value * 24 * 60 * 60 * 1000),
                end_date: new Date()
            }
        }

        // 这儿的时间(字符串类型)是用来传递过后端 // "2018-07-28 15"
        function _dateFormat(date) {
            return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours();
        }

        function getAppsProgress() {
            if(!$scope.startPopup.date || !$scope.endPopup.date) return DialogService.alert("请选择正确的查询日期!");

            $scope.selectedDate = $scope.date;
            var params = $scope.dateStr = {start_date: _dateFormat($scope.startPopup.date), end_date: _dateFormat($scope.endPopup.date), searches: $scope.searches};
            return AppService.getAppsProgress(params).then(function(data) {
                return $scope.appsProgress = data;
            })
        }

        // 点击置顶,排序app
        function sortApp(app) {
            _.remove($scope.appsProgress,{key: app.key});
            $scope.appsProgress.unshift(app);
            AppService.sortApp({keys: _.map($scope.appsProgress, "key")}).then(function() {
                return getAppsProgress()
            }).then(function(data){
                $scope.appsProgress = data;
            })
        }

        function openDatePicker(popup) {
            $scope[popup].opened = true;
        }

        function _setCustomerChecked() {
            //去掉当前用户
            var currentUser = localStorage.getItem('username');
            _.each($scope.allCustomer, function(customer, index) {
                if (customer.name == currentUser) {
                    $scope.allCustomer.splice(index, 1);
                    return false;
                }
            })
            //设置是否已添加
            _.each($scope.allCustomer, function(customer) {
                _.each($scope.customers, function(item) {
                    if (customer.customer_key == item.customer_key) {
                        customer.isAdded = true;
                    }
                });
            });
            //排序，已添加到排前面
            $scope.allCustomer = _sortCustomers();
        }

        function _sortCustomers() {
            return _.sortBy($scope.allCustomer, function(customer) { return !customer.isAdded; });
        }

        function addCustomer(customer) {
            AppService.addCustomer({keys: [customer.customer_key]}).then(function(){
                customer.isAdded = true;
                $scope.search.email = "";
                $scope.allCustomer = _sortCustomers();
            });
        }

        function addCustomers() {
            var checkedCustomers = _.chain($scope.allCustomer).filter({ checked: true});
            if (checkedCustomers.value().length == 0) {
                return DialogService.alert('未选择任何用户！');
            }
            var willAddCustomers = checkedCustomers.filter(function(o) {
                return !o.isAdded;
            });
            if (willAddCustomers.value().length == 0) {
                return DialogService.alert('选择的用户已经全部添加，不能重复添加！');
            }
            AppService.addCustomer({keys: willAddCustomers.map('customer_key').value()}).then(function() {
                _.each(willAddCustomers.value(), function(customer) {
                    customer.isAdded = true;
                });
                $scope.allCustomer = _sortCustomers();
            });
        }

        function deleteCustomer(customer) {
            DialogService.confirm("确定移除此人员吗?").then(function() {
                return AppService.deleteCustomer({key: customer.customer_key})
            }).then(function() {
                customer.isAdded = false;
                $scope.allCustomer = _sortCustomers();
            });
        }

        function searchEmailChange() {
            $scope.isShowSearchPannel = !!$scope.search.email;
        }

        function chooseSearchEmail(email) {
            $scope.search.email = email;
            $scope.isShowSearchPannel = false;
        }
    }

    function AppController($scope, $state, $stateParams, $location, TbMd5, config, apps) {

        var allApps = _.concat(apps.mine, apps.invited);

        $scope.apps = apps;
        $scope.app = _.find(allApps, {
            key: $stateParams.key
        });

        if (!$scope.app) {
            $state.go("app.testcases", {
                key: allApps[0].key
            });
        }

        $scope.$watch("app", function(newVal, oldVal) {
            if (newVal !== oldVal) {
                $state.go("app.testcases", {
                    key: newVal.key
                });
            }
        });

        $scope.featureEnabled = function(feature) {
            return _.includes(config.features, TbMd5.soar(config.features && config.features[0], feature));
        };

        $scope.isActiveTab = function(currentRoute) {
            return ($location.hash()[1] || $location.path()).toLowerCase().indexOf("/" + currentRoute.toLowerCase()) >= 0;
        };

    }

    function MonitorController($scope, StfService, DialogService, AppService, ExecutionDetailService, MONITOR_ENUM) {
        var vm = this;

        $scope.task = {
            type: 0
        };
        $scope.device = null;
        vm.statusList = [
            {
                name: '正在运行',
                value: 1
            },
            {
                name: '空闲',
                value: 0
            }
        ]
        vm.device_status = 'all';
        vm.clientList = [];
        vm.stfScopes = [];

        vm.isIosNumBig = isIosNumBig;
        vm.getFilterDevices = getFilterDevices;
        vm.playVideo = playVideo;
        vm.stopVideo = stopVideo;

        _active();

        function _active() {
            vm.device_status = 'all';
            vm.getFilterDevices();
        }

        function _getStfListReady() {
            vm.clientList = [];
            vm.stfScopes = [];
            _.forEach(vm.devices, function(device) {
                device.task = {
                    type: 0
                };
                vm.clientList.push({});
                vm.stfScopes.push({});
            });
        }

        function isIosNumBig(device) {
            if (device.deviceType == 'android') {
                return true;
            } else {
                return ExecutionDetailService.getIosNum(device.os) >= 11;
            }
        }

        function getFilterDevices() {
            AppService.getDevices().then(function (data) {
                vm.freeDeviceNum = 0;
                vm.busyDeviceNum = 0;
                _.forEach(data, function(device) {
                    device.deviceType = /android/i.test(device.os) ? 'android' : 'ios';
                    if (device.locker) {
                        vm.busyDeviceNum++;
                    } else {
                        vm.freeDeviceNum++;
                    }
                })
                if (vm.device_status == 'all') {
                    vm.devices = data;
                } else {
                    vm.devices = _.filter(data, function(device) {
                        return vm.device_status == 0 ? !device.locker : device.locker;
                    });
                }
                vm.devices = _filterByKeyWord(vm.devices);
                _getStfListReady();
            });
        }

        function _filterByKeyWord(devices) {
            var result = [];
            if (!vm.keyWord) {
                result = _.cloneDeep(devices);
            } else {
                _.forEach(devices, function(device) {
                    var confirm = false
                    _.forEach(MONITOR_ENUM.deviceKeyWordFilter, function(keyWord) {
                        if (device[keyWord] && device[keyWord].indexOf(vm.keyWord) != -1) {
                            confirm = true;
                            return false;
                        }
                    });
                    if (confirm) {
                        result.push(device);
                    }
                });
            }
            return result;
        }

        function playVideo(device, index) {
            device.isPlay = true;
            $scope.selectedIndex = index;
        }

        function stopVideo(device, index) {
            vm.stfScopes[index].control.stopVideo({
                mode: '1',  //1表示实时视频
                requirements: {
                    serial: {
                        value: device.serial,
                        match: 'exact'
                    }
                }
            });
            device.isPlay = false;
            vm.stfScopes[index].client.close();
            vm.stfScopes[index].socket.close();
        }
    }

    function deviceStfCtrl($scope, $sce, StfService, DialogService) {
        $scope.rioDevice = _.cloneDeep($scope.vm.devices[$scope.selectedIndex]);
        $scope.device = null;
        $scope.type = 'video';
        $scope.rioDevice.serial = $scope.rioDevice.key;
        $scope.rioDevice.rentKey = $scope.rioDevice.rent_key;
        $scope.rioDevice.port = $scope.rioDevice.public_port;
        $scope.mode = '2'; // 2表示视频监控
        $scope.vm.stfScopes[$scope.selectedIndex] = $scope;
        $scope.vm.clientList[$scope.selectedIndex] = $scope.client = StfService.createClient({
            scope: $scope,
            device: $scope.rioDevice,
            token: $scope.rioDevice.rio_token,
            beforeunload: function () {
                return "是否结束播放？";
            }
        });
        $scope.client.watchs({
            //连接成功
            'connect.done': function (data) {
                $scope.device = data.device;
                $scope.control = data.control;
                $scope.socket = $scope.client.getSocket();
            },
            //连接失败
            'connect.failed': function (reject) {
                DialogService.error(reject.msg).then(function () {
                });
            }
        });
    }

    function PerformanceComparisonCtrl($scope, AppService, ModalService, $state, DialogService, $rootScope) {
        var vm = this;

        vm.showReport = showReport;
        vm.gotoPerformanceDetail = gotoPerformanceDetail;
        vm.addReportInfo = addReportInfo;
        vm.delCompareReport = delCompareReport;
        vm.deleteAppReport = deleteAppReport;
        vm.CompareListPagination = CompareListPagination;
        vm.compareReportListPagination = compareReportListPagination;
        vm.delCompareReports = delCompareReports;
        // vm.apps = apps;
        vm.appAllChecked = false;
        vm.reportAllChecked = false;
        vm.compareList = [];
        vm.selectReportIds = [];
        vm.selectCompareReportKeys = [];
        vm.compareReportList = '';
        vm.pageNum = [];
        vm.pageNumReport = [];
        vm.currentPage = 1;



        _active();

        function _active() {
            _getApps();
            _getCompareList();
            _getCompareReportList();
        }

        function _getApps() {
             return AppService.getAppList().then(function (apps) {
                 vm.apps = apps.mine
             });
        }

        function _getCompareList() {
            var pageLength = 0;
            return AppService.getCompareList(1).then(function (data) {
                 vm.pageNum = []
                 vm.compareList = data
                 addChecked(vm.compareList.results,false)
                 vm.currentPage = 1;
                 vm.lastPage = Math.ceil(vm.compareList.count/30)
                 pageLength = vm.lastPage > 3 ? 3 : vm.lastPage;
                 for(var i = 0;i < pageLength; i++){
                     vm.pageNum.push(i)
                 }
            })
        }

        function _getCompareReportList() {
            var pageLength = 0
            return AppService.getCompareReportList(1).then(function (data) {
                vm.pageNumReport =[]
                vm.compareReportList = data
                addChecked(vm.compareReportList.results,false)
                vm.currentPageReport = 1;
                vm.lastPageReport = Math.ceil(vm.compareReportList.count/30)
                pageLength = vm.lastPageReport > 3 ? 3 : vm.lastPageReport;
                for(var i = 0;i < pageLength; i++){
                     vm.pageNumReport.push(i)
                }
            })
        }

        function CompareListPagination(page) {
             _.forEach(vm.compareList.results, function(val) {
                if(val.checked && vm.selectReportIds.indexOf(val.id) == -1) vm.selectReportIds.push(val.id)
             });
            if(page < 1 || page > vm.lastPage) return;
            return AppService.getCompareList(page).then(function (data) {
                vm.currentPage = page;
                vm.appAllChecked = false;
                vm.pageNum = [];
                vm.pageNum = pagination(page, vm.lastPage)
                vm.compareList = data;
                // addChecked(vm.compareList.results,false)
                _.forEach(vm.compareList.results,function (val) {
                    if(vm.selectReportIds.indexOf(val.id) > -1){
                         val.checked = true;
                    }else {
                         val.checked = false;
                    }
                });
                //如果是末页，滚动条滚动到表格上方的标题处，避免末页数据偏少从而高度下降导致页面看起来滚动到下方去了
                if (page == vm.lastPage) $(window).scrollTop($("#compareListHead").offset().top);
            });
        }

        function compareReportListPagination(page) {
            _.forEach(vm.compareReportList.results, function(val) {
                if(val.checked && vm.selectCompareReportKeys.indexOf(val.key) == -1) vm.selectCompareReportKeys.push(val.key)
            });
            if(page < 1 || page > vm.lastPageReport) return;
            return AppService.getCompareReportList(page).then(function (data) {
                vm.currentPageReport = page;
                vm.pageNumReport = [];
                vm.reportAllChecked = false;
                vm.pageNumReport = pagination(page, vm.lastPageReport)
                vm.compareReportList = data;
                _.forEach(vm.compareReportList.results,function (val) {
                    if(vm.selectCompareReportKeys.indexOf(val.key) > -1){
                         val.checked = true;
                    }else {
                         val.checked = false;
                    }
                })
            })
        }

        function pagination(page, lastPage) {
             var pageNum = []
             if(page > 2 && page < lastPage) {
                 _getCurrentPageRange(page-2, page+1)
             }
             if(page < 2 && lastPage > 2) {
                 _getCurrentPageRange(0, page+2)
             }
             if(page < 2 && lastPage < 2) {
                 _getCurrentPageRange(0, page)
             }
             if(page < 2 && lastPage == 2) {
                 _getCurrentPageRange(0, page+1)
             }
             if(page == lastPage && page >= 3){
                 _getCurrentPageRange(page-3, page)
             }
             if(page == 2 && lastPage > 2){
                 _getCurrentPageRange(0, page+1)
             }
             if(page == 2 && lastPage <= 2){
                 _getCurrentPageRange(0, page)
             }
             function _getCurrentPageRange(start, end) {
                pageNum = []
                for(var i = start; i < end; i++){
                    pageNum.push(i)
                }
             }
             return pageNum;
        }

        function addChecked(data, flag){
             _.forEach(data,function (val) {
                 return val.checked = flag
             })
        }

        $scope.$watch('vm.appAllChecked', function() {
            _isSelect(vm.appAllChecked, vm.compareList.results)
        });

        $scope.$watch('vm.reportAllChecked', function() {
            _isSelect(vm.reportAllChecked, vm.compareReportList.results)
        });

        function _isSelect(watchObj, changeData) {
            if(watchObj){
                addChecked(changeData,true)
                return;
            }
            if(!watchObj){
                for(var i in changeData){
                    changeData[i].checked = false
                }
            }
        }

        function showReport(appKey) {
            ModalService.show({
                templateUrl: 'apps/app/templates/select.report.html',
                controller: 'SelectReportCtrl',
                controllerAs: 'vm',
                resolve: {
                    appCompareList: function() {
                        return AppService.getAppCompareList(appKey,1);
                    },
                    appKey: function () {
                        return appKey
                    }
                },
                size: 'lg'
            })
        }
        $rootScope.$on('updateCompareList', function(event, data){
            _getCompareList()
        })

        $rootScope.$on('updateCompareReportList', function(event, data){
            _getCompareReportList()
            _.forEach(vm.compareList.results,function (el) {
                if(el.checked) el.checked = false
            })
        })

        function gotoPerformanceDetail(key) {
            $state.go('performance', { key: key })
        }

        function addReportInfo(action) {
            var selectReportIds = []
             _.forEach(vm.compareList.results, function(val) {
                if(val.checked) selectReportIds.push(val.id)
             });
             vm.selectReportIds = _.concat(vm.selectReportIds, selectReportIds)
             if(action == 'add'){
                if(vm.selectReportIds.length == 0){
                     DialogService.alert('请选择需要生成对比报告的测试报告！')
                     return;
                 }
                 ModalService.show({
                    templateUrl: 'apps/app/templates/add.report.name.modal.html',
                    controller: 'CreateCompareReportCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        reportIds: function () {
                            return vm.selectReportIds;
                        }
                    },
                    size: 'lg'
                }).then(function() {
                    vm.selectReportIds = [];
                });
             }
             if(action == 'del'){
                 if(vm.selectReportIds.length == 0){
                     DialogService.alert('请选择需要删除的的测试报告！')
                     return;
                 }
                 DialogService.confirm("您确定删除这些测试报告吗?").then(function () {
                     return AppService.deleteAppReport({report_ids: vm.selectReportIds, is_compare: false}).then(function (data) {
                         _.forEach(vm.selectReportIds,function (id) {
                             _.remove(vm.compareList.results, function (el) {
                                 return el.id == id
                             });
                             if(vm.compareList.results.length == 0) _getCompareList()
                         })
                        vm.selectReportIds = [];
                     })
                 });
             }
        }

        function deleteAppReport(id) {
            DialogService.confirm("您确定删除该测试报告吗?").then(function () {
                AppService.deleteAppReport({report_ids: [id], is_compare: false} ).then(function (data) {
                    _.remove(vm.compareList.results, function (el) {
                         return el.id == id
                    });
                    if(vm.compareList.results.length == 0) _getCompareList()
                })
            })
        }

        function delCompareReport(key) {
             DialogService.confirm("您确定删除该对比报告吗?").then(function () {
                AppService.deleteCompareReport({data: {keys:[key]}}).then(function (data) {
                     _.remove(vm.compareReportList.results, function (el) {
                         return el.key == key
                     });
                     if(vm.compareReportList.results.length == 0) _getCompareReportList()
                })
             })
        }

        function delCompareReports() {
            var selectCompareReportKeys = []
             _.forEach(vm.compareReportList.results, function(val) {
                if(val.checked) selectCompareReportKeys.push(val.key)
             });
             vm.selectCompareReportKeys = _.concat(vm.selectCompareReportKeys, selectCompareReportKeys);
             if(vm.selectCompareReportKeys.length == 0){
                 DialogService.alert('请选择需要删除的的对比报告！')
                 return;
             }
            DialogService.confirm("您确定删除这些对比报告吗?").then(function () {
                return AppService.deleteCompareReport({data: {keys: vm.selectCompareReportKeys}}).then(function (data) {
                    _getCompareReportList()
                    vm.selectCompareReportKeys = [];
                })
             })
        }
    }

    function SelectReportCtrl($scope, $uibModalInstance, appCompareList, AppService, appKey, $rootScope, DialogService) {
        var vm = this;

        vm.appCompareList = appCompareList;
        vm.currentAppCompareList = appCompareList;
        vm.selectAppKey = appKey;
        vm.page = 2;
        vm.appReportAllChecked = false;

        vm.cancel = cancel;
        vm.close = close;
        vm.loadMore = loadMore;

        _active()

        function _active() {
            addChecked(vm.appCompareList.results, false)
        }

        $scope.$watch('vm.appReportAllChecked',function () {
            _isSelectAll()
        })

        function _isSelectAll(){
            if(vm.appReportAllChecked) {
                addChecked(vm.appCompareList.results, true);
                return;
            }
            if(!vm.appReportAllChecked){
                for(var i in vm.appCompareList.results){
                    vm.appCompareList.results[i].checked = false
                }
            }
        }

        function addChecked(data, flag){
             _.forEach(data,function (val) {
                 if (!val.is_compare) val.checked = flag;
             })
        }

        function loadMore() {
            return AppService.getAppCompareList(vm.selectAppKey, vm.page).then(function (data) {
                vm.currentAppCompareList = data
                vm.appCompareList.results = _.concat(vm.appCompareList.results, data.results)
                vm.page++;
                _isSelectAll()
            })
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }

        function close() {
            var selectReportIds = []
            _.forEach(vm.appCompareList.results, function(val) {
                if(val.checked) selectReportIds.push(val.id)
            });
            if(vm.appCompareList.count == 0){
                $uibModalInstance.close();
                return;
            }
            if(selectReportIds.length == 0){
                DialogService.alert('请选择需要对比的测试报告！')
                return;
            }
            return AppService.addCompareReport({report_ids: selectReportIds,is_compare: true, app_key: vm.selectAppKey }).then(function () {
                return AppService.getCompareList(1).then(function (data) {
                     $rootScope.$emit("updateCompareList", data);
                     $uibModalInstance.close();
                })
            })
        }
    }

    function CreateCompareReportCtrl($scope, $uibModalInstance, reportIds, AppService, $rootScope) {
        var vm = this;

        vm.reportIds = reportIds

        vm.cancel = cancel;
        vm.close = close;
        vm.compareReport = {name:'',desc:''}

        function cancel() {
            $uibModalInstance.dismiss();
        }

        function close() {
            if(vm.compareReport.name == '') {
                DialogService.alert('对比报告名称不能为空！')
                return;
            }
            return AppService.createCompareReport(_.merge(vm.compareReport,{reports: vm.reportIds})).then(function (data) {
                $rootScope.$emit("updateCompareReportList", data);
                $uibModalInstance.close();
            })
        }
    }

    function PerformanceComparisonDetailCtrl($scope, compareReportDetail, $state, AppService, detailId) {
        var vm = this;

        vm.compareReportDetail = compareReportDetail;
        vm.allCompareReportDetail = compareReportDetail;
        vm.devices = [];
        vm.testcases = [];
        vm.select_device = '全部机型';
        vm.select_testcase = '全部用例';
        vm.detailId = detailId;

        vm.chooseFilter = chooseFilter;
        vm.filterFun = filterFun;
        vm.gotoPerformance = gotoPerformance;
        vm.download = download;

        _active()

        function _active() {
            var devices = [], testcases = [];
            _.forEach(vm.compareReportDetail,function (el) {
                devices.push(el.device)
                testcases.push(el.testcase)
            })
            vm.devices = _.concat(['全部机型'],_.uniq(devices))
            vm.testcases = _.concat(['全部用例'],_.uniq(testcases))
        }

        $scope.$watch('vm.select_device', function() {
            filterFun()
        });

        $scope.$watch('vm.select_testcase', function() {
            filterFun()
        });

        function chooseFilter(testcase) {
            vm.select_testcase = testcase
        }

        function filterFun() {
            if(vm.select_device == '全部机型' && vm.select_testcase == '全部用例') {
                vm.compareReportDetail = vm.allCompareReportDetail;
                return;
            }
            if(vm.select_device == '全部机型' && vm.select_testcase != '全部用例') {
                vm.compareReportDetail = _.filter(vm.allCompareReportDetail,function (el) {
                    return el.testcase == vm.select_testcase;
                })
                return;
            }
            if(vm.select_device != '全部机型' && vm.select_testcase == '全部用例') {
                vm.compareReportDetail = _.filter(vm.allCompareReportDetail,function (el) {
                    return el.device == vm.select_device;
                })
                return;
            }
            if(vm.select_device != '全部机型' && vm.select_testcase != '全部用例') {
                vm.compareReportDetail = _.filter(vm.allCompareReportDetail,function (el) {
                    return el.testcase == vm.select_testcase && el.device == vm.select_device;
                })
                return;
            }
        }

        function gotoPerformance() {
            $state.go('apps', { tabType: 4 })
        }

        function download() {
            window.open("/api/task/report/compare/"+vm.detailId+"/export/")
        }
    }

    function TasksGatherCtrl($scope, $state, $q, $filter, DialogService, AppService, spinner) {
        var vm = this;

        vm.deviceTypes = ['android', 'ios'];
        vm.taskTypes = [
            {id: 1, name: '自动回归', selected: true},
            {id: 2, name: '定时自动回归', selected: true},
            {id: 3, name: '拨测监控', selected: true}
        ];
        vm.format = "yyyy-MM-dd";
        vm.startPopup = {
            opened: false,
            date: new Date().setTime(new Date().getTime() - 24 * 60 * 60 * 1000 * 6)
        };
        vm.endPopup = {
            opened: false,
            date: new Date()
        };
        vm.filters = {
            device_type: vm.deviceTypes[0],
            app_key: null,
            selected_app: null,
            types_text: '自动回归,定时自动回归,拨测监控',
            selected_types: _.cloneDeep(vm.taskTypes)
        };

        vm.changeSelectedDeviceType = changeSelectedDeviceType;
        vm.changeSelectedApp = changeSelectedApp;
        vm.toggleTaskType = toggleTaskType;
        vm.openDatePicker = openDatePicker;
        vm.getAppTasks = getAppTasks;
        vm.goExecutions = goExecutions;

        _activate();

        function _activate() {
            spinner.show();
            return AppService.getAppList().then(function(res) {
                vm.apps = res.mine.concat(res.invited);
                vm.filteredApps = _getFilteredApps();
                if (vm.filteredApps.length == 0) {
                    vm.filters.device_type = vm.deviceTypes[1];
                    vm.filteredApps = _getFilteredApps();
                }
                vm.filters.selected_app = vm.filteredApps[0];
                vm.filters.app_key = vm.filters.selected_app.key;
                return $q.when();
            }).then(function() {
                return vm.getAppTasks();
            });
        }

        function _getFilteredApps() {
            return _.filter(vm.apps, function(app) {
                return app.type == vm.filters.device_type;
            });
        }

        function changeSelectedDeviceType() {
            vm.filteredApps = _getFilteredApps();
            vm.filters.selected_app = vm.filteredApps[0];
            vm.filters.app_key = vm.filters.selected_app.key;
            if (vm.filteredApps.length == 0) {
                DialogService.alert('暂无该类型APP').then(function() {
                    vm.filters.device_type = vm.filters.device_type == 'ios' ? 'android' : 'ios';
                });
            } else {
                vm.changeSelectedApp();
            }
        }

        function changeSelectedApp() {
            vm.filters.selected_app = _.find(vm.filteredApps, function(app) {
                return app.key == vm.filters.app_key;
            });
            vm.getAppTasks();
        }

        function toggleTaskType(item) {
            item.selected = !item.selected;
            if (item.selected) {
                vm.filters.selected_types.unshift(item);
            } else {
                _.remove(vm.filters.selected_types, function(entity) {
                    return entity.id === item.id;
                });
            }
            vm.filters.types_text = "";
            _.forEach(vm.filters.selected_types, function(value, index) {
                vm.filters.types_text += value.name;
                if (index != vm.filters.selected_types.length - 1) {
                    vm.filters.types_text += ',';
                }
            });
            if (!vm.filters.types_text) vm.filters.types_text = '任务类型';
        }

        function openDatePicker(popup) {
            vm[popup].opened = true;
        }

        function getAppTasks() {
            spinner.show();
            var start_date = $filter('date')(vm.startPopup.date, 'yyyy-MM-dd');
            var end_date = $filter('date')(vm.endPopup.date, 'yyyy-MM-dd');
            var params = {
                types: _.map(vm.filters.selected_types, 'id').join(','),
                start_date: start_date ? start_date + ' 00:00:00' : null,
                end_date: end_date ? end_date + ' 23:59:59' : null
            };
            AppService.getAppTasks(vm.filters.selected_app.key, params).then(function(res) {
                vm.tasks = res;
                spinner.hide();
            });
        }

        function goExecutions(task) {
            window.open($state.href('app', {
                key: vm.filters.selected_app.key
            }) + '/' + _getExecutionHelf(task.task_type) + '/' + task.id + '/', '_blank');
        }

        function _getExecutionHelf(type) {
            var result = null;
            switch (type) {
                case '自动回归测试':
                    result = 'replaytask';
                    break;
                case '定时自动回归':
                    result = 'timedReplaytask';
                    break;
                case '拨测监控':
                    result = 'dialtesttask';
                    break;
            }
            return result;
        }
    }

})();
