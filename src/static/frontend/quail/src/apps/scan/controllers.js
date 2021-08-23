(function() {
    angular.module("scan")
        .controller("ScantasksController", ScantasksController)
        .controller("ScanExcutionsController", ScanExcutionsController)
        .controller("ScanDetailController", ScanDetailController)
        .controller("ScanModalController", ScanModalController);

    function ScantasksController($filter, $state, $q, ScanService, ModalService, DialogService, SCAN_ENUM, sensitiveItems) {
        var vm = this;
        var LOAD_PAGE_SIZE = 100;

        vm.format = "yyyy-MM-dd";
        vm.sensitiveItems = sensitiveItems;
        vm.scanTypes = _.cloneDeep(ScanService.scantaskFilters.scanTypes);
        vm.levels= _.cloneDeep(ScanService.scantaskFilters.levels);
        vm.taskFilter = {
            begin: 0,
            loadTotal: LOAD_PAGE_SIZE
        };
        vm.searches = {
            selectedScantypes: [],
            type_text: '扫描种类'
        }
        vm.startPopup = {
            opened: false,
            date: null
        };
        vm.endPopup = {
            opened: false,
            date: null
        };

        vm.refresh = refresh;
        vm.toggleScantypeItem = toggleScantypeItem;
        vm.openDatePicker = openDatePicker;
        vm.searchScantask = searchScantask;
        vm.updateScantask = updateScantask;
        vm.isSelectedSensitive = isSelectedSensitive;
        vm.scan = scan;
        vm.stopScantask = stopScantask;

        function refresh(){
            vm.taskFilter.begin = 0;
            vm.taskFilter.loadTotal = LOAD_PAGE_SIZE;
            _.forEach(vm.scantasks, function(task) {
                task.selectedScantypes = ScanService.initSelectedScantypes(task.type, vm.scanTypes);
                task.selectedSensitives = ScanService.initSelectedSensitives(task.sensitives, vm.sensitiveItems);
                task.dependency_ignore_severities = task.dependency_ignore_severities || "";
                task.selectedLevels = ScanService.initSelectedLevels(task.dependency_ignore_severities.split(','), vm.levels);
            });
        }

        function toggleScantypeItem(item) {
            item.selected = !item.selected;
            if (item.selected) {
                vm.searches.selectedScantypes.unshift(item);
            } else {
                _.remove(vm.searches.selectedScantypes, function(entity) {
                    return entity.id === item.id;
                });
            }
            vm.searches.type_text = "";
            _.forEach(vm.searches.selectedScantypes, function(value, index) {
                vm.searches.type_text += value.name;
                if (index != vm.searches.selectedScantypes.length - 1) {
                    vm.searches.type_text += ',';
                }
            });
            if (!vm.searches.type_text) vm.searches.type_text = '扫描种类';
        }

        function openDatePicker(popup) {
            vm[popup].opened = true;
        }

        function searchScantask() {
            var updated = $filter('date')(vm.endPopup.date, 'yyyy-MM-dd');
            var params = {
                type: _.chain(vm.searches.selectedScantypes).map('id').value().join(','),
                name: vm.searches.name,
                created: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd HH:mm:ss'),
                updated: updated ? updated + ' 23:59:59' : null
            };
            return ScanService.getScantasks(params).then(function(res) {
                vm.scantasks = res;
                vm.refresh();
            });
        }

        function updateScantask(task, modelType) {
            ModalService.show({
                templateUrl: 'apps/scan/templates/scan.modal.html',
                controller: 'ScanModalController',
                controllerAs: 'vm',
                windowClass: 'window-rent-modal',
                size: 'large',
                resolve: {
                    sensitiveItems: function() {
                        return ScanService.getSensitiveItems();
                    },
                    modelType: function() {
                        return modelType;
                    },
                    scantask: function() {
                        return task;
                    }
                }
            }).then(function(scantask) {
               ScanService.updateScantask(scantask).then(function() {
                   vm.searchScantask();
               });
            });
        }

        function isSelectedSensitive(task) {
            return ScanService.isSelectedSensitive(task.type);
        }

        function scan(task) {
            ScanService.getScantasks().then(function(scantasks) {
                if (ScanService.getRunningCount(scantasks) >= SCAN_ENUM.limitExecutionCount) {
                    return DialogService.confirm('当前任务队列已满，是否愿意排队？');
                } else {
                    return $q.when();
                }
            }).then(function() {
                return ScanService.scan(task);
            }).then(function() {
                return DialogService.alert('发起扫描成功');
            }).then(function() {
                return vm.searchScantask();
            });
        }

        function stopScantask(task) {
            ScanService.getScantasks().then(function(scantasks) {
                var selectedTask = _.find(scantasks, function(scantask) {
                    return task.key == scantask.key;
                });
                if (selectedTask.running_count > 0) {
                    return ScanService.stopScantask(selectedTask);
                } else {
                    return $q.reject();
                }
            }).then(function() {
                DialogService.alert('已终止扫描');
            }).then(function() {
                return vm.searchScantask();
            }).catch(function() {
                DialogService.alert('该任务已扫描完成，无需终止');
            });
        }
    }

    function ScanExcutionsController($stateParams, $state, $filter, ScanService, SCAN_ENUM, scanExecutions) {
        var vm = this;

        vm.format = "yyyy-MM-dd";
        vm.startPopup = {
            opened: false,
            date: null
        };
        vm.endPopup = {
            opened: false,
            date: null
        };
        vm.scantask_name = $stateParams.scantaskName;
        vm.scanExecutions = scanExecutions.scan_executions;

        vm.isSelectedSensitive = isSelectedSensitive;
        vm.isSelectedSafe = isSelectedSafe;
        vm.isComplete = isComplete;
        vm.isStoped = isStoped;
        vm.openDatePicker = openDatePicker;
        vm.searchScanExecutions = searchScanExecutions
        vm.goScanDetail = goScanDetail;

        _initStandline(scanExecutions.runnings);

        function _initStandline(runnings) {
            _.forEach(vm.scanExecutions, function(execution) {
                if (!_.find(runnings, function(running) { return execution.id == running; })) {
                    if (execution.sensitive_status == SCAN_ENUM.executionStatus.run || execution.safe_status == SCAN_ENUM.executionStatus.run) {
                        if (vm.isSelectedSensitive(execution)) {
                            execution.sensitive_status = SCAN_ENUM.executionStatus.wait;
                        }
                        if (vm.isSelectedSafe(execution)) {
                            execution.safe_status = SCAN_ENUM.executionStatus.wait;
                        }
                        execution.desc = '任务正在排队，等待扫描';
                    }
                }
            });
        }

        function openDatePicker(popup) {
            vm[popup].opened = true;
        }

        function isSelectedSensitive(execution) {
            return ScanService.isSelectedSensitive(execution.type);
        }

        function isSelectedSafe(execution) {
            return ScanService.isSelectedSafe(execution.type);
        }

        function isComplete(execution) {
            var result = true;
            var isSelectedSensitive = vm.isSelectedSensitive(execution);
            var isSelectedSafe = vm.isSelectedSafe(execution);
            if (isSelectedSensitive && execution.sensitive_status != SCAN_ENUM.executionStatus.complete) {
                result = false;
            }
            if (isSelectedSafe && execution.safe_status != SCAN_ENUM.executionStatus.complete) {
                result = false;
            }
            return result;
        }

        function isStoped(execution) {
            var result = true;
            var isSelectedSensitive = vm.isSelectedSensitive(execution);
            var isSelectedSafe = vm.isSelectedSafe(execution);
            if (isSelectedSensitive && execution.sensitive_status != SCAN_ENUM.executionStatus.stop) {
                result = false;
            }
            if (isSelectedSafe && execution.safe_status != SCAN_ENUM.executionStatus.stop) {
                result = false;
            }
            return result;
        }

        function searchScanExecutions() {
            var updated = $filter('date')(vm.endPopup.date, 'yyyy-MM-dd');
            var params = {
                created: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd HH:mm:ss'),
                updated: updated ? updated + ' 23:59:59' : null
            };
            ScanService.getScanExecutions($stateParams.scantaskKey, params).then(function(res) {
                vm.scanExecutions = res.scan_executions;
            });
        }

        function goScanDetail(execution) {
            var url = $state.href("scanDetail", {
                executionKey: execution.key
            });
            window.open(url);
        }
    }

    function ScanDetailController($sce, $timeout, $stateParams, ScanService, ModalService, SCAN_ENUM, spinner, scanDetail) {
        var vm = this;

        vm.isShowDetail = true; //下面的详情，导出概况时，方便隐藏
        vm.isShowAllSensitives = false;
        vm.isShowIgnoredSensitive = false;
        vm.isShowIgnoredSafe = false;
        vm.isGotResultfile = true;
        vm.scanResult = '1';
        vm.scanDetail = scanDetail;

        vm.isShowSafeTime = isShowSafeTime;
        vm.isShowDescSensitive = isShowDescSensitive;
        vm.isShowDescSafe = isShowDescSafe;
        vm.goExceptions = goExceptions;
        vm.goSafeExceptions = goSafeExceptions;
        vm.exportBasic = exportBasic;
        vm.exportAll = exportAll;
        vm.ignoreException = ignoreException;
        vm.deleteIgnoredException = deleteIgnoredException;
        vm.filterSafeExceptions = filterSafeExceptions;
        //分页
        var PAGE_SIZE = 100;
        vm.pageNum = 0;
        vm.changePageNum = changePageNum;
        vm.isLoadAllSensitive = isLoadAllSensitive;
        vm.sensitiveAllExceptions = [];
        vm.sensitiveExceptions = [];

        function changePageNum() {
            vm.pageNum++;
            var startIndex = (vm.pageNum - 1) * PAGE_SIZE;
            var endIndex = (vm.pageNum * PAGE_SIZE) > vm.sensitiveAllExceptions.length ? vm.sensitiveAllExceptions.length : (vm.pageNum * PAGE_SIZE);
            var pageExceptions = vm.sensitiveAllExceptions.slice(startIndex, endIndex);  //当前页待处理的数据
            var pageFilterExceptions = ScanService.initSensitiveExceptions(pageExceptions, vm.ignoredSensitiveExceptions);
            _trustAshtml(pageFilterExceptions);
            vm.sensitiveExceptions = _.concat(vm.sensitiveExceptions, pageFilterExceptions);
        }

        function isLoadAllSensitive() {
            return (vm.pageNum * PAGE_SIZE) >= vm.sensitiveAllExceptions.length;
        }

        _active();

        function _active() {
            vm.safeFilters = _.cloneDeep(ScanService.safeFilters);
            vm.ignoredSensitiveExceptions = ScanService.initIgnoredExceptions(scanDetail.exceptions.sensitive);
            _trustAshtml(vm.ignoredSensitiveExceptions);
            if (scanDetail.result_file) {
                vm.isGotResultfile = false;
                ScanService.getResultFile(scanDetail.result_file).then(function(res) {
                    vm.sensitiveResult = res;
                    var reg = new RegExp("\n", "g");
                    vm.sensitiveResult.versionLogs = vm.sensitiveResult.versionLogs ? vm.sensitiveResult.versionLogs.replace(reg, "<br/>") : "";
                    vm.sensitiveResult.versionLogs = $sce.trustAsHtml(vm.sensitiveResult.versionLogs);
                    vm.sensitiveAllExceptions = res.result;
                    vm.changePageNum();
                    vm.isGotResultfile = true;
                });
            } else {

            }

            //三方库扫描，可能会获取失败
            if (scanDetail.safe_scan_result.summary) {
                vm.ignoredSafeExceptions = ScanService.initIgnoredExceptions(scanDetail.exceptions.safe);
                vm.safeExceptions = ScanService.initSafeExceptions(scanDetail.safe_scan_result.detail, vm.ignoredSafeExceptions);
                vm.scanDetail.safe_scan_result.summary.last_change_time = Number(vm.scanDetail.safe_scan_result.summary.last_change_time);
                vm.scanDetail.safe_scan_result.summary.svn_log = vm.scanDetail.safe_scan_result.summary.svn_log || "";
                vm.scanDetail.safe_scan_result.summary.svn_log = vm.scanDetail.safe_scan_result.summary.svn_log.replace(/\\n/g, "<br/>");
                vm.scanDetail.safe_scan_result.summary.svn_log = $sce.trustAsHtml(vm.scanDetail.safe_scan_result.summary.svn_log);
                var dependency_ignore_severities = vm.scanDetail.dependency_ignore_severities ? vm.scanDetail.dependency_ignore_severities.split(',') : [];
                if (dependency_ignore_severities.length > 0) {
                    _.forEach(vm.safeFilters, function (value, key) {
                        if (_.find(dependency_ignore_severities, function (severiry) { return severiry == value.text; })) {
                            vm.safeFilters[key].value = false;
                        }
                    });
                }
                vm.filterSafeExceptions();
            }
        }

        function _trustAshtml(results) {
            _.forEach(results, function (result) {
                result.html = $sce.trustAsHtml(result.lineRed);
            });
        }

        function isShowSafeTime() {
            if (vm.scanDetail.safe_scan_result.summary) {
                if (vm.scanDetail.result_file) {
                    return vm.scanDetail.safe_scan_result.summary.total_time_cost > (vm.scanDetail.measures.downloadTime + vm.scanDetail.measures.searchTime);
                } else {
                    return true;
                }
            } else {
                return false;
            }
        }

        function isShowDescSensitive() {
            return !vm.scanDetail.result_file && isSelectedSensitive(vm.scanDetail.type);
        }

        function isShowDescSafe() {
            return vm.scanDetail.safe_scan_result.summar && isSelectedSafe(vm.scanDetail.type);
        }

        function isSelectedSensitive(type) {
            return ScanService.isSelectedSensitive(type);
        }

        function isSelectedSafe(type) {
            return ScanService.isSelectedSafe(type);
        }

        function goExceptions(id) {
            $(window).scrollTop($("#" + id).offset().top);
        }

        function goSafeExceptions() {
            $(window).scrollTop($("#sensitive_exceptions").offset().top);
        }

        function exportBasic() {
            $('title').text('敏感词扫描_' + vm.scanDetail.scan_task_name);
            spinner.show();
            var isShowDetail = vm.isShowDetail;
            vm.isShowDetail = false;
            $timeout(function() {
                window.print();
                vm.isShowDetail = isShowDetail;
                spinner.hide();
            }, 500);
        }

        function exportAll() {
            return ScanService.exportExcel($stateParams.executionKey, vm.scanResult);
        }

        function ignoreException(exception, modelType, scanType) {
            ModalService.show({
                templateUrl: 'apps/scan/templates/scan.modal.html',
                controller: 'ScanModalController',
                controllerAs: 'vm',
                windowClass: 'window-rent-modal',
                size: 'large',
                resolve: {
                    sensitiveItems: function () {
                        return [];
                    },
                    modelType: function () {
                        return modelType;
                    },
                    scantask: function () {
                        return {};
                    }
                }
            }).then(function (model) {
                _.extend(exception, model);
                ScanService.ignoreException($stateParams.executionKey, exception, scanType).then(function(key) {
                    if (scanType == SCAN_ENUM.scanType.sensitive) {
                        _.remove(vm.sensitiveExceptions, function(entity) {
                            return entity.keyword == exception.keyword
                                && entity.file == exception.file
                                && entity.line == exception.line
                                && _.difference(entity.beforeLines, exception.beforeLines).length == 0
                                && _.difference(entity.afterLines, exception.afterLines).length == 0
                                && entity.startPos == exception.startPos;
                        });
                        vm.ignoredSensitiveExceptions.push(_.extend(exception, {key:key}));
                    } else if (scanType == SCAN_ENUM.scanType.safe) {
                        _.remove(vm.safeExceptions, function(entity) {
                            return entity.severity == exception.severity
                                && entity.CWE == exception.CWE
                                && entity.file == exception.file
                                && entity.vulnerability == exception.vulnerability;
                        });
                        vm.filterSafeExceptions();
                        vm.ignoredSafeExceptions.push(_.extend(exception, {key:key}));
                    }
                });
            });
        }

        function deleteIgnoredException(exception, scanType) {
            ScanService.deleteIgnoredException($stateParams.executionKey, exception, scanType).then(function() {
                if (scanType == SCAN_ENUM.scanType.sensitive) {
                    _.remove(vm.ignoredSensitiveExceptions, function (entity) {
                        return entity.key == exception.key;
                    });
                    vm.sensitiveExceptions.unshift(exception);
                } else if (scanType == SCAN_ENUM.scanType.safe) {
                    _.remove(vm.ignoredSafeExceptions, function (entity) {
                        return entity.key == exception.key;
                    });
                    vm.safeExceptions.unshift(exception);
                    vm.filterSafeExceptions();
                }
            });
        }

        function filterSafeExceptions() {
            var selectedLevel = _.filter(vm.safeFilters, function(o) {
                return o.value;
            });
            vm.safeFilteredExceptions = _.filter(vm.safeExceptions, function (exception) {
                return _.find(selectedLevel, function (level) {
                    return exception.severity == level.text;
                });
            });
        }
    }

    function ScanModalController($uibModalInstance, ScanService, ModalService, DialogService, SCAN_ENUM, sensitiveItems, modelType, scantask) {
        var vm = this;

        vm.modelType = modelType;
        vm.scantask = _.cloneDeep(scantask) || {};
        vm.scantask.safe_text = '第三方全库扫描';
        vm.scantask.fileType = vm.scantask.filename ? "zip" : "svn";
        vm.scantask.scantype_text = _getItemsText(vm.scantask.selectedScantypes);
        vm.scanTypes = _initSelected(vm.scantask.selectedScantypes, _.cloneDeep(ScanService.scantaskFilters.scanTypes));
        vm.scantask.sensitive_text = _getItemsText(vm.scantask.selectedSensitives);
        vm.sensitiveItems = _initSelected(vm.scantask.selectedSensitives, sensitiveItems);
        vm.scantask.ignore_files = vm.scantask.ignore_files ? vm.scantask.ignore_files.join(',') : '';
        vm.scantask.ignore_keywords = vm.scantask.ignore_keywords ? vm.scantask.ignore_keywords.join(',') : '';
        vm.levels = _initSelected(vm.scantask.selectedLevels, _.cloneDeep(ScanService.scantaskFilters.levels));
        vm.scantask.level_text = _getItemsText(vm.scantask.selectedLevels);
        vm.scantask.dependency_ignore_files = vm.scantask.dependency_ignore_files || '';
        vm.scantask.dependency_ignore_vulnerabilities = vm.scantask.dependency_ignore_vulnerabilities || '';
        vm.scantask.ignore_comment_lines = vm.scantask.ignore_comment_lines ? '1' : '0';

        vm.valid = {
            scantype_text: false,
            sensitive_text: false
        };

        vm.toggleScantypeItem = toggleScantypeItem;
        vm.toggleSensitiveItem = toggleSensitiveItem;
        vm.toggleLevelItem = toggleLevelItem;
        vm.isSelectedSensitive = isSelectedSensitive;
        vm.isSelectedSafe = isSelectedSafe;
        vm.uploadZip = uploadZip;
        vm.commit = commit;
        vm.validate = validate;
        vm.close = close;
        vm.cancel = cancel;

        function _initSelected(selected, items) {
            _.forEach(items, function(item) {
                item.selected = false;
            });
            _.forEach(selected, function(value) {
                _.forEach(items, function(item, index) {
                    if (value.id === item.id) {
                        items[index].selected = true;
                    }
                });
            });
            return items;
        }

        function toggleScantypeItem(item) {
            item.selected = !item.selected;
            if (item.selected) {
                vm.scantask.selectedScantypes.unshift(item);
            } else {
                _.remove(vm.scantask.selectedScantypes, function(entity) {
                    return entity.id === item.id;
                });
            }
            vm.scantask.scantype_text = _getItemsText(vm.scantask.selectedScantypes);
        }

        function toggleSensitiveItem(item) {
            item.selected = !item.selected;
            if (item.selected) {
                vm.scantask.selectedSensitives.unshift(item);
            } else {
                _.remove(vm.scantask.selectedSensitives, function(entity) {
                    return entity.id === item.id;
                });
            }
            vm.scantask.sensitive_text = _getItemsText(vm.scantask.selectedSensitives);
        }

        function toggleLevelItem(item) {
            item.selected = !item.selected;
            if (item.selected) {
                vm.scantask.selectedLevels.unshift(item);
            } else {
                _.remove(vm.scantask.selectedLevels, function(entity) {
                    return entity.id === item.id;
                });
            }
            vm.scantask.level_text = _getItemsText(vm.scantask.selectedLevels);
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

        function isSelectedSensitive() {
            return _.find(vm.scantask.selectedScantypes, function(type) { return type.id == 0; });
        }

        function isSelectedSafe() {
            return _.find(vm.scantask.selectedScantypes, function(type) { return type.id == 1; });
        }

        function uploadZip(files) {
            ScanService.readFile(files).then(function(file) {
                return ScanService.uploadZip(file);
            }).then(function(url) {
                vm.scantask.filename = url;
            });
        }

        function commit() {
            if (vm.validate()) {
                vm.close();
            } else {
                return;
            }
        }

        function validate() {
            _.forEach(vm.valid, function(value, key) {
                if (key == 'sensitive_text') {
                    if (vm.isSelectedSensitive() && !vm.scantask[key]) {
                        vm.valid[key] = true;
                    } else {
                        vm.valid[key] = false;
                    }
                } else if (key == 'repertory') {
                    if (vm.scantask.fileType == 'svn') {
                        if (!vm.scantask[key]) {
                            vm.valid[key] = true;
                        } else {
                            vm.valid[key] = false;
                        }
                    }
                } else if (key == 'zipUrl') {
                    if (vm.scantask.fileType == 'zip') {
                        if (!vm.scantask[key]) {
                            vm.valid[key] = true;
                        } else {
                            vm.valid[key] = false;
                        }
                    }
                } else {
                    if (!vm.scantask[key]) {
                        vm.valid[key] = true;
                    } else {
                        vm.valid[key] = false;
                    }
                }
            })
            return !_.find(vm.valid, function(o) { return o });
        }

        function close() {
            if (vm.modelType == 'create') {
                $uibModalInstance.close(vm.scantask);
            } else {
                $uibModalInstance.close(vm.exception);
            }
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }
    }

})();