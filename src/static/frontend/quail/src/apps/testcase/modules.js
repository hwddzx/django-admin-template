(function() {
    angular.module('quail.testcases', ['quail.excel', 'as.sortable'])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider.state('app.testcases', {
                url: '/testcases',
                templateUrl: 'apps/testcase/templates/testcases.html',
                controller: 'TestCasesCtrl',
                controllerAs: 'vm',
                resolve: {
                    testcases: function(TestcasesService, $stateParams) {
                        return TestcasesService.createTestcases($stateParams.key);
                    }
                },
                params: {
                    selectNodeId: ""
                }
            }).state('app.testcases.detail', {
                url: '/detail/:id',
                templateUrl: 'apps/testcase/detail/templates/testcase.detail.html',
                controller: 'TestcaseDetailCtrl',
                controllerAs: 'vm',
                resolve: {
                    testcase: function(TestCaseService, $stateParams) {
                        return TestCaseService.getTestCase($stateParams.id);
                    },
                    scriptJsonInstance: function($q, testcase, ScriptJsonService, $stateParams) {
                        return $q.when(ScriptJsonService.init(testcase, $stateParams.isTestcaseDetail));
                    }
                },
                params: {
                    testcase: '',
                    isTestcaseDetail: true
                },
                onEnter: function() {
                    $('body').addClass("body-overflow-hidden")
                },
                onExit: function() {
                    $('body').removeClass("body-overflow-hidden");
                }
            }).state('app.testcases.detail.snapshots', {
                url: '/snapshots',
                templateUrl: 'apps/testcase/detail/templates/testcase.snapshots.html'
            }).state('app.testcases.detail.params', {
                url: '/parameters',
                templateUrl: 'apps/testcase/detail/templates/testcase.parameters.html',
                controller: 'TestcaseParametersCtrl',
                controllerAs: 'vm',
                resolve: {
                    variables: function($q, $stateParams, VariableService, scriptJsonInstance) {
                        //进入参数界面前更新模块参数列表
                        return $q.all([VariableService.getVariables($stateParams.key), scriptJsonInstance.syncComponentParams()]).then(function(res) {
                            return res[0];
                        });
                    }
                }
            }).state('app.testcases.detail.snapshot', {
                url: '/snapshot/:snapshotKey',
                templateUrl: 'apps/testcase/detail/templates/testcase.snapshot.html',
                controller: "TestcaseSnapshotCtrl",
                controllerAs: "vm"
            });
        }])
        .constant("TESTCASE_ENUM", {
            type: {
                case: 0,
                scenario: 1
            },
            priority: {
                '0': '高',
                '10': '中',
                '20': '低'
            },
            status: {
                not_in_recording: 0,
                recording: 1,
                record_failed: -1
            },
            scriptStatus: {
                none_script: 0,
                unfinished_debug: 1,
                finished_debug: 2
            },
            clickMode: {
                coordinate: 1, //坐标点击
                controlPriority: 0, //控件优先点击 （如果未找到控件，使用坐标点击）
                controlForce: 2, //控件强制点击（如果未找到控件，报错）
                controlNotForce: 4, //控件非强制点击（如果未找到控件，跳过这一步）
                imagePriority: 5, //图像优先点击（如果未找到图像，使用坐标点击）
                imageForce: 3, //图像强制点击（如果未找到图像，报错）
                imageNotForce: 6 //图像非强制点击（如果未找到图像，跳过这一步）

            },
            completionStatus: {
                note: 0,
                uncompleted: 1,
                completed: 2
            },
            snapshotActions: ["click", "doubleClick", "longClick", "drag", "dragObject", "scrollIntoView", "setText", "toast", "pressKey"],
            clickActions: ["click", "doubleClick", "longClick"],
            paramActions: ["drag", "dragObject", "scrollIntoView", "initVariable", 'updateVariable', "plugin-dev", "plugin-tc", "setText"],
            mainControlActions: ["click", "doubleClick", "longClick", "drag", "dragObject", "scrollIntoView", "setText", "toast", "pressKey"],
            oftenActionsField:{
                "click":["sleep","fixedSleep","repeat","xPath","xPathWithoutResId","clickMode","params","actionId","componentName"],
                "doubleClick":["sleep","fixedSleep","repeat","xPath","xPathWithoutResId","clickMode","params","actionId","componentName"],
                "longClick":["sleep","fixedSleep","repeat","xPath","xPathWithoutResId","clickMode","params","actionId","componentName"],
                "setText":["params","actionId","componentName"],
                "monkey":["params","actionId","componentName"],
                "scrollIntoView":["xPath","direction","container","actionId","componentName"],
                "plugin-dev":["sleep","params","actionId","componentName"],
                "plugin-tc":["sleep","params","actionId","componentName"],
                "initVariable":["variableName","variableValue","xPath","xPathWithoutResId","sleep","variableRegex","checkVariable","actionId","componentName"],
                "dragObject":["xPath","xPathWithoutResId","direction","distance","actionId","componentName"],
                "distance":["xPath","xPathWithoutResId","direction","container","actionId","componentName"],
                "container":["params","actionId","componentName"],
                "if":["action",'condition'],
                "elif":["action",'condition'],
                "else":["action",'condition'],
                "endif":["action",'condition'],
                "while":["action",'condition'],
                "endwhile":["action",'condition']
            },
            needCutActions:["click","doubleClick","longClick","drag","setText","monkey","scrollIntoView","plugin-dev","plugin-tc","initVariable","dragObject","distance","container","if","elif","else","endif","endif","while","endwhile"],
            variableType: {
                init: 0,
                update: 1,
                image: 2
            },
            paramType: {
                image: 'image',
                layout: 'layout'
            },
            regular: {
                param: /^[a-zA-Z][_]?([a-zA-Z0-9][_]?)*$/,
                varibale: /^[a-zA-Z][a-zA-Z0-9_]*$/,
                alias: /^[a-zA-Z][a-zA-Z0-9]*$/,
                matchAll: "(.*)",
                validFormula: /\{.+\}/,
                extractionFormulaParam: /{[^\n\r}]+}/g,
                isChineseReg: /.*[\u4e00-\u9fa5]+.*$/
            },
            fileSuffix: {
                originalImg: '_o.jpg',
                gesturesImg: '.jpg',
                checkedImg: '.jpg',
                xml: '.xml',
                anchor: '.anchor'
            },
            xPathKeys: ['xPathDefault', 'xPathIndex', 'xPathText'],
            createComponentType: {
                click: "0",
                drag: "1"
            },
            dragType: {
                scrollableXpath: "0",
                scrollIntoView: "1",
                scrollByCoordinate: "2"
            },
            dragDirection: {
                up: "up",
                down: "down",
                right: "right",
                left: "left"
            },
            dragOrientation: {
                vertical: "vertical",
                horizontal: "horizontal"
            },
            grammarCheck: [
                ['if', 'endif'],
                ['while', 'endwhile']
            ]
        })
        .value("TESTCASE_VALIDATE_VALUE", {
            isNeedAlertValidate: true,
            hasAlertValidate: false
        });
})();
