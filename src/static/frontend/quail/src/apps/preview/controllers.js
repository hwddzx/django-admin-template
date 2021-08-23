(function() {
    angular.module("preview")
        .controller("PreviewController", PreviewController);

    function PreviewController($state, $scope, $stateParams, $timeout, PreviewService, userList, preview) {
        var vm = this,
            appKey = $stateParams.appKey;

        vm.userList = userList;
        vm.preview = preview;

        vm.getUserPreview = getUserPreview;
        vm.chooseUser = chooseUser;

        $timeout(function() {
            _initScenarioTree(vm.preview.scenarios);
        });

        function getUserPreview(user) {
            PreviewService.getUserPreview(appKey, {user_id: user ? user.id : undefined}).then(function(data) {
                vm.preview = data;
                _initScenarioTree(vm.preview.scenarios);
            })
        }

        function chooseUser(user) {
            getUserPreview(vm.currentUser = user);
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
                        name: "name",
                        title: "name"
                    }
                },
                view: {
                    showIcon: false,
                    showTitle: false,
                    showLine: false,
                    dblClickExpand: false,
                    fontCss: _getFontCss,
                    addDiyDom: _addDiyDom
                },
                callback: {
                    onClick: function(event, treeId, treeNode) {
                        $state.go("app.testcases", {key: appKey, selectNodeId: treeNode.id});
                    }
                }
            };

            $scope.$broadcast("buildTreeTable");

        }

        function _addDiyDom(treeId, treeNode) {
            var $treeNode,
                isShowProgress = treeNode.permission == "修改",
                html = "",
                percent = treeNode.total_testcases == 0 ? 0 : Math.floor(treeNode.completed_testcases / treeNode.total_testcases * 100),
                colorClass = "";

            html += '<span class="progress-text" ng-show="{{' + isShowProgress + '}}">' + percent + '%</span><div class="progress" ng-show="{{' + isShowProgress + '}}">' +
                '<div class="completed" style="width: ' + percent + '%"></div>' +
                '</div>';

            $treeNode = $("#" + treeNode.tId + "_span");
            var spantxt = $treeNode.html();
            if (spantxt.length > 38) {
                spantxt = spantxt.substring(0, 38) + "...";
                $treeNode.html(spantxt);
            }
            $treeNode.after(html);
        }

        function _getFontCss() {
            return {
                "font-size": "14px",
                "line-height": "35px",
                "color": "#191e25"
            };
        }
    }
})();