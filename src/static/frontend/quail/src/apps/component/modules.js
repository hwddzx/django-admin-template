(function() {
    angular.module("testcase.component", [])
        .config(['$stateProvider', function($stateProvider) {
            var componenets;
            $stateProvider
                .state("app.component", {
                    url: "/component/:selectedComponentId",
                    templateUrl: "apps/component/templates/index.html",
                    controller: "componentController",
                    controllerAs: "vm",
                    resolve: {
                        components: function($stateParams, componentService) {
                            return componenets = componentService.getComponents($stateParams.key)
                        }
                    }
                })
                .state("app.component.manageComponent", {
                    url: "/manageComponent",
                    templateUrl: "apps/component/templates/manage.html",
                    controller: "manageController",
                    controllerAs: "vm",
                    resolve: {
                        testcases: function(TestCaseService, $stateParams) {
                            return TestCaseService.getTestCases($stateParams.key);
                        }
                    },
                    params: {
                        type: 0,
                        isUpdate: '',
                        component: ''
                    }
                })
                .state('app.component.directory', {
                    url: "/directory",
                    templateUrl: "apps/component/templates/manage.html",
                    controller: "manageController",
                    controllerAs: "vm",
                    resolve: {
                        testcases: function(TestCaseService, $stateParams) {
                            return TestCaseService.getTestCases($stateParams.key);
                        }
                    },
                    params: {
                        type: 1,
                        isUpdate: '',
                        component: ''
                    }
                })
                .state('app.component.detail', {
                    url: '/detail/:id/:componentName',
                    templateUrl: 'apps/testcase/detail/templates/testcase.detail.html',
                    controller: 'TestcaseDetailCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        testcase: function(TestCaseService, componentService, $stateParams) {
                            return componentService.getComponent($stateParams.id).then(function(testcase) {
                                TestCaseService.createSnapshotsByScriptJson(testcase);
                                return testcase;
                            });
                        },
                        scriptJsonInstance: function($q, testcase, ScriptJsonService) {
                            return $q.when(ScriptJsonService.init(testcase));
                        }
                    },
                    params: {
                        testcase: ''
                    },
                    onEnter: function() {
                        $('body').addClass("body-overflow-hidden")
                    },
                    onExit: function() {
                        $('body').removeClass("body-overflow-hidden");
                    }
                })
                .state('app.component.detail.snapshots', {
                    url: '/snapshots',
                    templateUrl: 'apps/testcase/detail/templates/testcase.snapshots.html'
                })
                .state('app.component.detail.snapshot', {
                    url: '/snapshot/:snapshotKey',
                    templateUrl: 'apps/testcase/detail/templates/testcase.snapshot.html',
                    controller: "TestcaseSnapshotCtrl",
                    controllerAs: "vm"
                })
        }])
        .constant("COMPONENT_ENUM", {
            type: {
                directory: 1,
                component: 0
            }
        })
})();