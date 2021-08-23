(function() {
    angular.module("permission")
        .controller("PermissionController", PermissionController);

    function PermissionController($scope, $state, $stateParams, DialogService, PermissionService, allUser, userList, config) {
        var vm = this,
            appKey = $stateParams.key;

        vm.allUser = allUser;
        vm.userList = userList;
        vm.currentUser = null;
        vm.nodes = [];
        vm.searchEmail = "";
        vm.isShowSearchPannel = false;
        vm.permissions = [{permission: 1, label: "查看"}, {permission: 4, label: "修改"}];
        vm.permission = {};

        vm.addUser = addUser;
        vm.chooseUser = chooseUser;
        vm.deleteUser = deleteUser;
        vm.settingPermission = settingPermission;
        vm.searchEmailChange = searchEmailChange;
        vm.chooseSearchEmail = chooseSearchEmail;

        vm.chooseUser(userList[0]);

        function addUser() {
            var temp = _.find(vm.allUser, {email: vm.searchEmail});
            if (!temp) {
                DialogService.alert("请输入有效的邮箱!")
            }
            PermissionService.addUser(appKey, {user_id: temp.id}).then(function(data) {
                vm.searchEmail = "";
                vm.userList.push(data);
            })
        }

        function chooseUser(user) {
            if (vm.currentUser = user) {
                PermissionService.getUserInfo(appKey, {user_id: vm.currentUser.id}).then(function(data) {
                    vm.permission = data;
                    _initScenarioTree(data.scenarios);
                })
            }
        }

        function deleteUser(id) {
            PermissionService.deleteUser(appKey, {user_id: id}).then(function() {
                _.remove(vm.userList, {id: id});
                // 删除当前选中的user,则重新选中第一个
                if (vm.currentUser.id == id) {
                    vm.chooseUser(vm.userList[0])
                }
            })
        }

        function settingPermission(key, level, scenarioId) {
            var params = {
                user_id: vm.currentUser.id,
                scenario_id: scenarioId
            };

            if (key == "supervisor") {
                vm.permission.is_supervisor = !vm.permission.is_supervisor;
                params.is_supervisor = vm.permission.is_supervisor;
            } else {
                params.permission = level;
            }
            PermissionService.settingPermission(appKey, params).then(function() {
                if (key == "supervisor") {
                    return;
                } else {
                    vm.chooseUser(vm.currentUser);
                }
            })
        }

        function searchEmailChange() {
            vm.isShowSearchPannel = !!vm.searchEmail;
        }

        function chooseSearchEmail(email) {
            vm.searchEmail = email;
            vm.isShowSearchPannel = false;
        }

        function _initScenarioTree(nodes) {
            vm.nodes = nodes;
            angular.forEach(vm.nodes, function(node) {
                // 展开的node才能被当做DiyDom编译
                node.open = true;
            });

            vm.setting = {
                data: {
                    simpleData: {
                        enable: true,
                        idKey: "id",
                        pIdKey: "parent_id"
                    },
                    key: {
                        name: "name"
                    }
                },
                view: {
                    showIcon: false,
                    showTitle: false,
                    showLine: false,
                    dblClickExpand: false,
                    fontCss: _getFontCss,
                    addDiyDom: _addDiyDom
                }
            };

            $scope.$broadcast("buildTreeTable");

        }

        function _addDiyDom(treeId, treeNode) {
            var $treeNode,
                permission = treeNode.permission,
                html = '<div class="permission-wrap" uib-dropdown>' +
                    '<div class="btn-set-tag" uib-dropdown-toggle>' + permission + '<i class="fa fa-sort-desc"></i></div>' +
                    '<div class="dropdown-menu permission-menu" uib-dropdown-menu>' +
                    '   <ul>' +
                    '      <li role="menuitem" ng-repeat="permission in vm.permissions" ng-click="vm.settingPermission(\'permission\', permission.permission, ' + treeNode.id + ')">' +
                    '         <span ng-bind="permission.label"></span>' +
                    '    </li>' +
                    '</ul>' +
                    '</div>' +
                    '</div>';

            $treeNode = $("#" + treeNode.tId + "_span");
            $treeNode.after(html);
        }

        function _getFontCss() {
            return {
                "font-size": "14px",
                "line-height": "35px",
                "color": "#191e25"
            };
        }

        function _getTreeObj() {
            return $.fn.zTree.getZTreeObj("testcase-tree1");
        }
    }
})();