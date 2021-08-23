(function () {
    angular.module('report_v2')
        .controller('reportSubtasksCtrl', reportSubtasksCtrl);

    function reportSubtasksCtrl($uibModal, $stateParams, subtasks, $translate, reportV2Service, config) {
        var vm = this;
        vm.subtasks = subtasks.subtasks;
        // 缺省按照测试结果排序
        vm.sortField = {key: "result_subtype.name", reverse: false};
        vm.rioEnabled = config.rioEnabled;
        vm.isOffline = config.isOffline;

        // 默认加载或点击"加载更多"时加载table行数
        vm.pageSize = vm.loadCount = 50;
        vm.isCNLocale = config.isCNLocale;
        vm.taskKey = $stateParams.key;

        vm.fieldFilters = fieldFilters;
        vm.toggleFilterItem = toggleFilterItem;
        vm.removeSelectedItem = removeSelectedItem;
        vm.hasItemSelected = hasItemSelected;
        vm.chooseExceptionDesc = chooseExceptionDesc;
        vm.collapse = collapse;
        vm.filters = [{
            key: 'result',
            name: '测试结果',
            items: [],
            selectedItems: [],
            handle: function (obj) {
                return obj['result_subtype'].name
            }
        }, {
            key: 'exceptionDesc',
            name: '问题摘要',
            items: [],
            selectedItems: [],
            handle: function (obj) {
                return obj['exception_desc'];
            }
        }, {
            key: 'vendor',
            name: '终端品牌',
            items: [],
            selectedItems: [],
            handle: function (obj) {
                return obj.device_model['vendor']
            }
        }, {
            key: 'os',
            name: '系统版本',
            items: [],
            selectedItems: [],
            handle: function (obj) {
                return obj.device_model['os'];
            }
        }, {
            key: 'resolution',
            name: '分辨率',
            items: [],
            selectedItems: [],
            handle: function (obj) {
                return obj.device_model['resolution'];
            }
        }, {
            key: 'ram',
            name: '内存',
            items: [],
            selectedItems: [],
            handle: function (obj) {
                return obj.device_model['ram'];
            }
        }];
        vm.filterByVendor = filterByVendor;
        vm.vendors = [];

        _.each(vm.filters, function (filter) {
            filter.items = _.chain(vm.subtasks).map(filter.handle).uniq().compact().map(function (item) {
                return {value: item}
            }).value();

            // 品牌下拉列表用于table品牌过滤
            vm.vendors = _.find(vm.filters, {key: "vendor"}).items;
        });

        function fieldFilters(subtask) {
            return _.every(vm.filters, function (filter) {
                return filter.selectedItems.length ? !!_.find(filter.selectedItems, function (selectItem) {
                    if (filter.key == "result") {
                        return subtask.result_subtype.name == selectItem.value;
                    } else if (filter.key == "exceptionDesc") {
                        return subtask.exception_desc == selectItem.value;
                    } else {
                        return subtask.device_model[filter.key] == selectItem.value;
                    }
                }) : true;
            });
        }

        function toggleFilterItem(item, filter) {
            item.selected = !item.selected;
            if (item.selected) {
                filter.selectedItems.unshift(item);
            } else {
                _.remove(filter.selectedItems, function (obj) {
                    return obj.value == item.value;
                })
            }
        }

        function removeSelectedItem(item, filter, $event) {
            $event.stopPropagation();
            $event.preventDefault();
            item.selected = false;
            _.remove(filter.selectedItems, function (obj) {
                return obj.value == item.value;
            })
        }

        function hasItemSelected() {
            return _.findIndex(vm.filters, function (filter) {
                return filter.selectedItems.length > 0
            }) != -1;
        }

        // 错误描述只允许单选,所有选择不同选项时要把已选择的项selected赋值false
        function chooseExceptionDesc(item, filter) {
            _.each(filter.items, function (obj) {
                if (obj.selected && item.value != obj.value) {
                    obj.selected = false;
                    return false;
                }
            });

            if (!item.selected) {
                item.selected = !item.selected;
                filter.selectedItems[0] = item;
            } else if (item.value == "全部问题摘要") {
                filter.selectedItems = [];
            }
        }

        // 过滤条件显示展开或收起
        function collapse(filter) {
            filter.isCollapse = !filter.isCollapse;
        }

        function filterByVendor(vendor) {
            vm.keywords = vendor;
        }

        // table加载更多
        vm.loadMore = function (isCollapse) {
            vm.pageSize = isCollapse ? vm.loadCount : vm.pageSize + vm.loadCount;
        };
    }

})();
