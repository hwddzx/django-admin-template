(function() {

    angular.module("quail.rent-modal", ['ui.bootstrap'])
        .factory("RentModalService", RentModalService)
        .directive("tbSearchCrumb", tbSearchCrumb)
        .directive("integerNumberInput", IntegerNumberInput)
        .controller('TestcaseStepCtrl', TestcaseStepController)
        .controller('DeviceStepCtrl', DeviceStepController)
        .controller('DurationStepCtrl', DurationStepController)
        .constant("RENT_MODAL_STEP", {
            chooseCase: 0,
            chooseDevice: 1,
            chooseTime: 2
        })
        .constant("RENT_TYPE", {
            record: "record", //录制
            domestic: "domestic", //自助功能
            replay: "replay" //回放
        });

    function RentModalService($uibModal, $q, TaskService, TestCaseService, spinner, RENT_TYPE) {
        return {
            /*
            options: task,app,needTestcase,hideTimes
            */
            open: function(options) {
                // 有时候device接口请求时间过长,导致用户多次点击租用按钮,会弹出多个租用框,加个spinner防止用户多次点击,再device请求返回后关闭
                spinner.show();
                return $uibModal.open({
                    templateUrl: 'components/rent-modal/rent.modal.html',
                    windowClass:'window-rent-modal',
                    size: 'lg',
                    resolve: {
                        releases: function(ReleaseService) {
                            return ReleaseService.getReleases(options.app.key);
                        },
                        testcases: function() {
                            return TestCaseService.getTestCases(options.app.key, options.hasScript);
                        },
                        taskTestcases: function() {
                            // 追加测试才需要请求
                            return options.task.id ? TaskService.getTaskTestcases(options.task) : $q.when([]);
                        },
                        devices: function() {
                            var params = {
                                min_os: "4.1",
                                os: options.app.type,
                                type: options.rentType || RENT_TYPE.record
                            };

                            // notUsedInTask: 兼容性测试添加设备的taskId
                            if (options.notUsedInTask) {
                                params["not_used_in_task"] = options.notUsedInTask;
                            }

                            return TaskService.getDeviceList(params).then(function(data){
                                spinner.hide();
                                return data;
                            });
                        },
                        mails: function() {
                            return TaskService.getMails();
                        }
                    },
                    controller: function ($scope, $uibModalInstance, testcases, releases, taskTestcases, spinner, devices, mails, REPLAY_MODE, TASK_ENUM, RENT_MODAL_STEP) {

                        _.extend($scope, options);
                        spinner.hide();

                        // 用例
                        $scope.releases = releases;
                        $scope.testcases = testcases;
                        $scope.mails = mails;
                        $scope.taskTestcases = taskTestcases;

                        //设备
                        $scope.devices = devices;
                        $scope.task.duration = ($scope.task.duration || $scope.task.duration == 0) ? $scope.task.duration : TASK_ENUM.defaultDuration;

                        //任务类型
                        $scope.isRevise = ($scope.task.id !== undefined);
                        $scope.isScriptRecord = ($scope.task.type == TASK_ENUM.taskType.record);
                        $scope.isReplay = ($scope.task.type == TASK_ENUM.taskType.replay);
                        $scope.isComptest = ($scope.replayMode == REPLAY_MODE.comptest);
                        $scope.needChooseTime = !$scope.task.id && !$scope.isScriptRecord;

                        $scope.step = $scope.step || RENT_MODAL_STEP.chooseCase;

                        $scope.preStep = function() {
                            $scope.step && $scope.step--;
                        };

                        $scope.hasPreStep = function(item) {
                            return options[item];
                        };

                        $scope.nextStep = function() {
                            if ($scope.isLastStep()) {
                                return $scope.close();
                            }
                            if ($scope.step == RENT_MODAL_STEP.chooseCase && !$scope.needChooseDevice && $scope.needChooseTime) {
                                $scope.step = RENT_MODAL_STEP.chooseTime;
                            } else {
                                $scope.step++;
                            }

                            // hit QUAIL-6399 bug
                            if ($scope.step == RENT_MODAL_STEP.chooseTime) {
                                if ($scope.isFirstValid) {
                                    $scope.$broadcast("triggerValidate", {
                                        success: function() {
                                        }
                                    }); // 验证通过,使用element.bootstrapValidator('disableSubmitButtons', false)来防止QUAIL-6399中的bug
                                } else {
                                    $scope.isFirstValid = true;// 第一次进入duration.step.html界面不验证
                                }
                            }
                        };

                        $scope.isLastStep = function() {
                            var step = $scope.step;
                            return (step == RENT_MODAL_STEP.chooseCase
                                && !$scope.needChooseDevice
                                && !$scope.needChooseTime)
                                || (step == RENT_MODAL_STEP.chooseDevice
                                && !$scope.needChooseTime)
                                || (step == RENT_MODAL_STEP.chooseTime)
                                || $scope.notUsedInTask      // 添加设备跳过命名页面
                                || $scope.task.isDistribute // isDistribute 任务分发
                        };

                        $scope.getNextBtnText = function() {
                            var text = $scope.task.isDistribute ? "执行" : "创建任务";
                            text = $scope.isLastStep() ? ($scope.isRevise ? '追加测试' : text) : '下一步';
                            return $scope.lastStepText || text;
                        };

                        $scope.cancel = function() {
                            $uibModalInstance.dismiss();
                        };

                        $scope.close = function() {
                            $uibModalInstance.close();
                        }

                    }

                }).result;
            }
        };
    }

    function TestcaseStepController($scope, $filter, AppClientService, ReleaseService, DialogService, TASK_ENUM, TESTCASE_ENUM) {

        var vm = this;

        vm.setting = {};
        vm.checkedCount = 0;
        vm.nodes = $scope.testcases;
        vm.toggleExecutedTestcase = toggleExecutedTestcase;
        vm.toggleRecordedTestcase = toggleRecordedTestcase;
        vm.createRelease = createRelease;
        vm.chooseRelease = chooseRelease;
        vm.getTestcaseTags = getTestcaseTags;
        vm.orFilterTestCases = orFilterTestCases;
        vm.andFilterTestCases = andFilterTestCases;
        vm.stopPropagation = stopPropagation;
        vm.cancel = $scope.cancel;
        vm.nextStep = nextStep;
        vm.releases = $scope.releases;
        vm.release = $scope.task.release = $scope.releases[0];
        vm.expect_duration = {
            value: 20,
            unit: 'step'
        };
        $scope.task.name = $scope.task.name || ($scope.isReplay ? '自动回放' : $scope.app.name);
        $scope.task.priority = $scope.task.priority || 20;
        $scope.task.repeatTimes = $scope.task.repeat_times || 1;


        _initTree();

        //录制脚本只录制当前用例
        if ($scope.task.scriptTestcase) {
            nextStep()
        }


        function nextStep() {
            selectedTestcases = $scope.task.scriptTestcase || (_.chain(_getTreeObj().getCheckedNodes(true))
                .filter({ type: 0 })
                .map(function(item) {
                    return _.pick(item, 'id', 'name');
                })
                .value());

            if (_.isEmpty(selectedTestcases) && $scope.needTestcase) {
                return DialogService.alert("您还没有选择用例！");
            }
            $scope.task.testcases = selectedTestcases;
            if ($scope.task.testcases.length === 0) {
                $scope.task.name = "探索测试";
            }
            if ($scope.isComptest) {
                $scope.task.name = "兼容性测试";
            }
            $scope.task.release = vm.release;

            $scope.nextStep();
        }

        function createRelease() {
            AppClientService.createRelease({
                key: $scope.app.key,
                data: vm.releases,
                source: function() {
                    return ReleaseService.getReleases($scope.app.key);
                },
                callback: function(data) {
                    vm.releases = data;
                    vm.release = data[0];
                }
            });
        }

        function chooseRelease(release) {
            $scope.task.release = vm.release = release;
        }

        // 获取所有用例的标签作为过滤条件
        function getTestcaseTags() {
            var temp = vm.tags;
            vm.tags = [];
            _.each($scope.testcases, function(node) {
                node.tags && (vm.tags = vm.tags.concat(node.tags));
            });
            vm.tags = _.chain(vm.tags).uniq().map(function(tag) {
                return {name: tag}
            }).each(function(tag) {
                // 选中已经checked的节点
                _.each(temp, function(t) {
                    if (t.checked && tag.name == t.name) tag.checked = true;
                })
            }).value();
        }

        //并集过滤
        function orFilterTestCases() {
            var tags = _.map(_.filter(vm.tags, {checked: true}), "name");
            if (_.isEmpty(tags)) {
                vm.nodes = $scope.testcases;
            } else {
                var filterTestcase = _.filter($scope.testcases, function(testcase) {
                        return testcase.type == TESTCASE_ENUM.type.case && !_.isEmpty(_.intersection(testcase.tags, tags));
                    }),
                    filterDirectory = _.filter($scope.testcases, function(testcase) {
                        return testcase.type == TESTCASE_ENUM.type.scenario;
                    });

                _filterTestCases(filterTestcase, filterDirectory);
            }
        }

        //交集过滤
        function andFilterTestCases() {
            var tags = _.map(_.filter(vm.tags, {checked: true}), "name");
            if (_.isEmpty(tags)) {
                vm.nodes = $scope.testcases;
            } else {
                var filterTestcase = _.filter($scope.testcases, function(testcase) {
                        return testcase.type == TESTCASE_ENUM.type.case && _.intersection(testcase.tags, tags).length == tags.length;
                    }),
                    filterDirectory = _.filter($scope.testcases, function(testcase) {
                        return testcase.type == TESTCASE_ENUM.type.scenario;
                    });

                _filterTestCases(filterTestcase, filterDirectory);
            }
        }

        function _filterTestCases(filterTestcase, filterDirectory) {
            var nodes = [],
                parent;
            nodes.push.apply(nodes, filterTestcase);

            // 相同父节点只保留一个
            filterTestcase = _.uniqBy(filterTestcase, "parent_id");

            // 从子节点开始,通过子节点parent_id和其父节点的id对应,一层层往上找目录并加入nodes中
            _.each(filterTestcase, function (t) {
                recursive(t, filterDirectory);

                function recursive(t, filterDirectory) {
                    parent = _.find(filterDirectory, function (d) {
                        return t.parent_id == d.id;
                    });
                    if (parent) {
                        nodes.push(parent);
                        _.remove(filterDirectory, parent);
                        recursive(parent, filterDirectory)
                    }
                }
            });

            // 把重复的目录去掉
            vm.nodes = _.uniqBy(nodes, "id");
        }

        function stopPropagation(event) {
            event.stopPropagation();
        }

        function toggleExecutedTestcase(newVal, oldVal) {
            var treeObj = _getTreeObj();
            treeObj[vm.nodes.hideExecutedTestcase ? 'hideNodes' : 'showNodes'](treeObj.getNodesByParam('executed', true, null));
            _resetCheckedCount();
        }

        function toggleRecordedTestcase(newVal, oldVal) {
            var treeObj = _getTreeObj();
            treeObj[vm.nodes.hideRecordedTestcase ? 'hideNodes' : 'showNodes'](treeObj.getNodesByParam('has_script', true, null));
            _resetCheckedCount();
        }

        function _initTree() {

            //根节点默认展开
            vm.nodes[0].open = true;
            vm.nodes.hideExecutedTestcase = true;
            vm.nodes.hideRecordedTestcase = true;
            //场景节点都设置为父节点
            angular.forEach(vm.nodes, function(node) {
                if (node.type == TESTCASE_ENUM.type.scenario) {
                    node.isParent = true;
                    $scope.isComptest && (node.nocheck = true);
                } else {
                    node.isParent = false;
                }

                //追加测试时，已执行过的用例不显示
                if ($scope.isRevise && _.find($scope.taskTestcases, { id: node.id })) {
                    node.executed = true;
                    node.isHidden = true;
                }

                if ($scope.isScriptRecord && node.has_script) {
                    node.isHidden = true;
                }

                //参数回放模式，未配置参数的用例不显示
                // if ($scope.isReplay && $scope.replayMode == REPLAY_MODE.text && !node.isParent && node.expanding_dim == 0) {
                //     node.isHidden = true;
                // }
            });

            vm.setting = {
                check: {
                    enable: true
                },
                data: {
                    simpleData: {
                        enable: true,
                        pIdKey: 'parent_id'
                    }
                },
                view: {
                    showIcon: true,
                    showLine: false,
                    dblClickExpand: false,
                    fontCss: _getFontCss,
                    addDiyDom: _addDiyDom
                },
                callback: {
                    onClick: function(event, treeId, treeNode) {
                        _getTreeObj().expandNode(treeNode);
                    },
                    onCheck: function() {
                        $scope.$apply(function() {
                            _resetCheckedCount();
                        });
                    }
                }
            };

            if ($scope.singleTestCaseSelect) {
                vm.setting.check.chkStyle = "radio";
                vm.setting.check.radioType = "all"
            }

        }

        function _addDiyDom(treeId, treeNode) {
            var $treeNode,
                iconParamHtml = "<span class='button icon-param' ></span>";

            if (treeNode.type == TESTCASE_ENUM.type.case) {
                $treeNode = $("#" + treeNode.tId + "_span");
                if (treeNode.expanding_dim) {
                    $treeNode.after(iconParamHtml);
                }
            }
        }

        function _getFontCss(treeId, treeNode) {
            return {
                "font-size": "14px",
                "color": (treeNode.executed || ($scope.isScriptRecord && treeNode.has_script)) ? 'gray' : '#333'
            };
        }

        function _resetCheckedCount() {
            vm.checkedCount = _.filter(_getTreeObj().getCheckedNodes(true), { isParent: false }).length;
        }

        function _getTreeObj() {
            return $.fn.zTree.getZTreeObj("testcase-tree");
        }

    }

    function DeviceStepController($scope, $timeout, FileService, TaskService, UploadService, SCHEDULE_MODE, TASK_ENUM) {
        var vm = this;

        vm.releases = $scope.releases;
        vm.release = $scope.releases[0];
        //默认数值
        $scope.task.device = $scope.task.device || [];
        $scope.task.schedule_mode = $scope.task.schedule_mode || SCHEDULE_MODE[$scope.isComptest ? 'private' : 'share'];
        $scope.task.replay_mode = $scope.replayMode;

        // 录制脚本和自助功能测试只显示空闲的设备
        if ($scope.task.type == TASK_ENUM.taskType.manual || $scope.task.type == TASK_ENUM.taskType.record) {
            _.remove($scope.devices, function(device) {
                return device.status != 0;
            });
        }

        //将设备随机排序
        vm.devices = _.shuffle($scope.devices);
        vm.filters = [];

        vm.fieldFilters = fieldFilters;
        vm.readDeviceKeys = readDeviceKeys;
        vm.toggleFilterItem = toggleFilterItem;
        vm.removeSelectedItem = removeSelectedItem;
        vm.isItemSelected = isItemSelected;
        vm.hasItemSelected = hasItemSelected;
        vm.checkDevices = checkDevices;
        vm.chooseModetype = chooseModetype;
        vm.chooseAllFilterDevices = chooseAllFilterDevices;
        vm.invertChooseDevices = invertChooseDevices;
        vm.cancel = $scope.cancel;
        vm.preStep = preStep;
        vm.hasPreStep = hasPreStep;
        vm.nextStep = nextStep;
        vm.resetParams = resetParams;
        vm.chooseRelease = chooseRelease;

        //回放时支持多选，自助功能测试仅支持单选
        vm.multiSelect = $scope.isReplay || $scope.isComptest;
        vm.isChooseAll = false;
        vm.isGetDeviceKeys = false; // 读取设备Key之后可以一键反选
        vm.filterDevices = [];

        vm.readDeviceKeys = readDeviceKeys;

        _activate();

        function _activate() {
            //$scope.task.release might be null if TestcaseStep is skipped.
            if (!$scope.task.release && $scope.task.release_build) {
                $scope.task.release = _.find($scope.releases, { build: $scope.task.release_build });
            }

            vm.filters = [{
                key: 'manufacturer',
                name: '品牌',
                items: [],
                selected: [],
                fieldFetcher: function(d) {
                    return d['manufacturer']
                }
            }, {
                key: 'os',
                name: '操作系统',
                items: [],
                selected: [],
                fieldFetcher: function(d) {
                    return d['os']
                }
            }, {
                key: 'ram',
                name: '内存',
                items: [],
                selected: [],
                fieldFetcher: function(d) {
                    return d['ram'] = Math.round(d['ram'] / 1024) + "G";
                }
            }, {
                key: 'resolution',
                name: '分辨率',
                items: [],
                selected: [],
                fieldFetcher: function(d) {
                    d['resolution'] = d['screen_width'] + 'x' + d['screen_length'];
                    return d['resolution'];
                }
            }, {
                key: 'tags',
                name: 'Tag',
                items: [],
                selected: [],
                fieldFetcher: function(d) {
                    return d['tags'] = _.values(d['tags']);
                }
            }];

            // 自动回归测试和兼容测试才显示设备状态
            if ($scope.isReplay || $scope.isComptest) {
                vm.filters.push({
                    key: 'status',
                    name: '状态',
                    items: [],
                    selected: [],
                    fieldFetcher: function(d) {
                        return d['status'] = d['status'] == 0 ? "空闲" : "忙碌";
                    }
                })
            }

            _.each(vm.filters, function(filter) {
                if (filter.key == "tags") {
                    filter.items = _.chain(_.union.apply(null, _.map(vm.devices,filter.fieldFetcher))).map(function(item) {
                        return {value: item}
                    }).sortBy("value").value();
                } else {
                    filter.items = _.chain(vm.devices).map(filter.fieldFetcher).uniq().map(function(item) {
                        return {value: item}
                    }).sortBy("value").value();
                }
            });

        }

        function readDeviceKeys(files) {
            if(_.isEmpty(files)) return;

            FileService.readAsJson(files[0]).then(function(json) {
                var deviceKeys = _.keys(json);
                $scope.task.device = [];
                _.forEach(vm.filterDevices, function(device) {
                    if (deviceKeys.indexOf(device.key) == -1) {
                        device.checked = false;
                    } else {
                        device.checked = true;
                        $scope.task.device.push(device);
                    }
                });
                //读取失败提示两秒
                if (!$scope.task.device.length) {
                    $scope.readDeviceError = true;
                    $timeout(function () {
                        $scope.readDeviceError = false;
                    }, 2000)
                } else {
                    vm.isGetDeviceKeys = true;
                }
            })
        }

        function preStep() {
            $scope.preStep();
        }

        function hasPreStep() {
            return $scope.hasPreStep("needTestcase");
        }

        function nextStep() {
            $scope.task.device_key = $scope.task.device[0].key;
            $scope.task.schedule_mode = parseInt($scope.task.schedule_mode);
            $scope.nextStep();
        }

        function fieldFilters(device) {
            return _.every(vm.filters, function(filter) {
                return filter.selected.length ? !!_.find(filter.selected, function(selectItem) {
                    if (filter.key == "tags") {
                        return _.indexOf(device[filter.key], selectItem.value) >= 0;
                    } else {
                        return device[filter.key] === selectItem.value;
                    }
                }) : true;
            });
        }

        function toggleFilterItem(item, filter) {
            item.selected = !item.selected;
            if (item.selected) {
                filter.selected.unshift(item);
            } else {
                _.remove(filter.selected, function(entity) {
                    return entity.value === item.value;
                });
            }

            chooseAllFilterDevices();
        }

        function removeSelectedItem(selectedItem, filter, $event) {
            $event.stopPropagation();
            $event.preventDefault();
            selectedItem.selected = false;
            _.remove(filter.selected, function(entity) {
                return entity.value === selectedItem.value;
            });

            chooseAllFilterDevices();
        }

        function isItemSelected(item, filter) {
            return item.selected;
        }

        function hasItemSelected() {
            var hasItem = false;
            _.each(vm.filters, function(filter) {
                if (filter.selected.length) {
                    hasItem = true;
                    return false;
                }
            });
            return hasItem;
        }

        function checkDevices(device) {

            var containDevice = _.find($scope.task.device, function(checkedDevice) {
                return checkedDevice.key == device.key;
            });

            if (containDevice) {
                _.remove($scope.task.device, { "key": device.key })
            } else {
                if (!vm.multiSelect) {
                    _.each($scope.task.device, function(item) {
                        item.checked = false;
                    });
                    $scope.task.device = [];
                }
                $scope.task.device.push(device)
            }
        }

        function chooseModetype(type) {
            $scope.task.schedule_mode = type;
        }

        function chooseAllFilterDevices() {
            $timeout(function() {
                $scope.task.device = [];
                if(vm.isChooseAll){
                    _.each(vm.filterDevices, function(device) {
                        device.checked = true;
                        $scope.task.device.push(device);
                    })
                }else{
                    _.each(vm.devices, function(device) {
                        device.checked = false;
                    })
                }
            })
        }

        //反选读取设备key选中的设备
        function invertChooseDevices() {
            $timeout(function() {
                $scope.task.device = [];
                _.each(vm.filterDevices, function(device) {
                    device.checked = !device.checked;
                    device.checked && $scope.task.device.push(device);
                })
            });
            vm.isGetDeviceKeys = false;
        }

        function resetParams(files) {
            TaskService.readFile(files, function(file){
                UploadService.upload(file, UploadService.getFileKey(file, "config")).then(function(url) {
                    $scope.task.config_url = url;
                });
            });
        }

        function chooseRelease(release) {
            $scope.task.release = vm.release = release;
        }

    }

    function DurationStepController($scope, $state, $filter, ExecutionDetailService, config) {
        var vm = this;

        vm.task = $scope.task;
        vm.app = $scope.app;
        vm.rentType = $scope.rentType;
        vm.isComptest = $scope.isComptest;
        vm.mails = $scope.mails;
        vm.releases = $scope.releases;
        vm.customer = config.customer;
        vm.task.release = _.find(vm.releases, function(release) { return vm.task.release_version == release.version; }) || vm.releases[0];
        vm.task.app_release_id = vm.task.release.id.toString();
        vm.task.name = vm.task.name || ($scope.isReplay ? '自动回放' : $scope.app.name);
        vm.task.priority = vm.task.priority || 20;
        vm.task.repeatTimes = vm.task.repeat_times || 1;
        vm.task.retest_times = vm.task.retest_times || 0;
        vm.task.retest_type = vm.task.retest_type || (vm.isComptest ? -3 : 0);
        vm.task.clearMode = vm.task.clear_mode || 0;
        vm.task.periodValue = vm.task.period || vm.task.period == 0 ? vm.task.period : 60;
        vm.task.is_override = vm.task.is_override == false ? false : true;
        vm.task.is_monkey = vm.task.is_monkey || false;
        vm.task.monkey_steps= vm.task.monkey_steps || 20;
        vm.task.isSendmail = vm.task.mail_group ? 1 : 0;
        vm.task.mail_group = vm.task.mail_group ? vm.task.mail_group : (vm.mails[0] ? vm.mails[0].id : null);
        vm.stateName = $state.current.name;
        vm.isTimedTask = $state.current.name == "app.timedReplaytasks" || $state.current.name == "app.timedComptesttasks" || $state.current.name == "app.dialtesttasks";// 定时任务
        vm.isAndroid = $scope.app.type == 'android';
        vm.task.save_video = vm.task.saveVideo || vm.task.save_video ? 1 : 0;
        vm.task.send_report = vm.task.send_report ? 1: 0;
        vm.task.which_days = vm.task.which_days || [1, 2, 3, 4, 5];
        vm.task.which_time_start = vm.task.which_time_start || null;
        vm.task.which_time_stop = vm.task.which_time_stop || null;
        vm.whichDayItems = [
            {name: '周一', id: 1, selected: false},
            {name: '周二', id: 2, selected: false},
            {name: '周三', id: 3, selected: false},
            {name: '周四', id: 4, selected: false},
            {name: '周五', id: 5, selected: false},
            {name: '周六', id: 6, selected: false},
            {name: '周日', id: 7, selected: false},
        ];
        vm.task.selectedDays = _initSelectedDays();
        vm.task.whichDays_text = _getItemsText(vm.task.selectedDays);
        //时间使用新的字段，以免改变格式后影响列表(若为空，则赋予默认值，否则自动回归时不填此项，无法通过验证，此为暂时处理方法)
        var date = new Date();
        var minute = date.getMinutes();
        if (minute > 56) {
            date.setMinutes(minute - 56);
            date.setHours(date.getHours() + 1);
        } else {
            date.setMinutes(minute + 3);
        }
        date = $filter('date')(date, 'yyyy-MM-dd HH:mm:ss');
        //转换格式存于另一个变量，否则经过输入框的格式改变后会影响列表里相关字段的展示
        vm.task.scheduleTime = vm.task.schedule_time ? $filter('date')(vm.task.schedule_time * 1000, 'yyyy-MM-dd HH:mm:ss') : date;
        vm.task.endTime = vm.isTimedTask ? (vm.task.end_time ? $filter('date')(vm.task.end_time * 1000, 'yyyy-MM-dd HH:mm:ss')  : null) : date;
        vm.task.deadLine = vm.task.dead_line && vm.isTimedTask ? $filter('date')(vm.task.dead_line * 1000, 'yyyy-MM-dd HH:mm:ss') : null;

        vm.toggleWhichDayItems = toggleWhichDayItems;
        vm.isOther = isOther;
        vm.cancel = cancel;
        vm.close = close;
        vm.preStep = preStep;
        vm.hasPreStep = hasPreStep;
        vm.isShowMail = isShowMail;
        vm.alertVideoWarnning = alertVideoWarnning;

        function toggleWhichDayItems(item) {
            item.selected = !item.selected;
            if (item.selected) {
                vm.task.selectedDays.unshift(item);
            } else {
                _.remove(vm.task.selectedDays, function(day) {
                    return day.id === item.id;
                });
            }
            vm.task.selectedDays = _.sortBy(vm.task.selectedDays, function(o) { return o.id; });
            vm.task.whichDays_text = _getItemsText(vm.task.selectedDays);
        }

        function _initSelectedDays() {
            var result = []
            _.forEach(vm.whichDayItems, function(item) {
                if (_.find(vm.task.which_days, function(day) { return day == item.id; })) {
                    item.selected = true;
                    result.push(item);
                }
            });
            return result;
        }

        function _getItemsText(selectedItems) {
            var text = "";
            _.forEach(selectedItems, function(value, index) {
                text += value.name;
                if (index != selectedItems.length - 1) {
                    text += ',';
                }
            });
            return text;
        }

        function isOther() {
            return vm.isTimedTask || (vm.isComptest && !vm.isTimedTask && vm.isAndroid);
        }

        function cancel() {
            $scope.cancel();
        }

        function close() {
            vm.task.ct_task_id = vm.task.ct_task_id || undefined;
            if (vm.task.app_release_id) vm.task.app_release_id = Number(vm.task.app_release_id);
            if (!vm.isTimedTask) {
                vm.task.scheduleTime = null;
                vm.task.endTime = null;
            }
            if (vm.isTimedTask && vm.task.periodValue) {
                vm.task.which_days = _.map(vm.task.selectedDays, 'id');
            } else {
                vm.task.which_days = [];
                vm.task.which_time_start = null;
                vm.task.which_time_stop = null;
            }
            $scope.close();
        }

        function preStep() {
            $scope.preStep();
        }

        function hasPreStep() {
            return $scope.hasPreStep("needChooseDevice");
        }

        function isShowMail() {
            return vm.customer == 'GUANGFA' || vm.customer == 'HUABAO' || vm.customer == 'XINGYE';
        }

        function alertVideoWarnning() {
            if (!vm.isAndroid && _hasIosLess()) {
                DialogService.alert('只有ios11以上的手机才能保存视频！');
            }
        }

        function _hasIosLess() {
            var result = false;
            _.forEach(vm.task.device, function (device) {
                if (ExecutionDetailService.getIosNum(device.os) < 11) {
                    result = true;
                    return false;
                }
            });
            return result;
        }
    }


    function tbSearchCrumb() {
        return {
            link: function(scope, element) {
                $(".choose-category").on("click", ".dropdown-menu li", function() {
                    calcDeviceListHeight();
                });

                calcDeviceListHeight();
                // 手机列表初始高度300,搜索框初始高度40,根据搜索框的高度来动态计算手机列表的高度
                function calcDeviceListHeight() {
                    setTimeout(function() {
                        $(".deivce-list").height(300 - $(element).height() + 40);
                    }, 0);
                }
            }
        }
    }

    function IntegerNumberInput() {

        return {
            restrict: 'A',
            link: function(scope, element) {
                // 190:'.' 189:'-' 109:数字键盘'-' 110:数字键盘'.'
                element.keydown(function(e) {
                    if (e.which === 190 || e.which === 189 || e.which === 109 || e.which === 110) {
                        e.preventDefault();
                    }
                });

            }
        }

    }


})();
