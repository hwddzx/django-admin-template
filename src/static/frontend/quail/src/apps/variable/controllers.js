(function() {
    angular.module('quail.variable')
        .controller('variableCtrl', variableController);

    function variableController($state, $stateParams, $timeout, DialogService, VariableService, variables, TESTCASE_ENUM) {
        var vm = this,
            key = $stateParams.key;

        vm.variables = variables;

        vm.addValue = addValue;
        vm.addVariable = addVariable;
        vm.saveVariables = saveVariables;
        vm.deleteValue = deleteValue;
        vm.deleteVariables = deleteVariables;
        vm.hasCheckedVariable = hasCheckedVariable;

        function addValue(index) {
            vm.variables[index].values_json.push("");
        }

        function addVariable() {
            var isEmptyVariableName = false,
                row;
            _.each(vm.variables, function (variable, index) {
                if (_.isEmpty(_.trim(variable.name))) {
                    row = index;
                    isEmptyVariableName = true;
                    return false;
                }
            });
            if (isEmptyVariableName) {
                DialogService.confirm("第" + (row + 1) + "行参数名不能为空!")
            } else {
                if (_validVariableName()) {
                    vm.variables.push({name: "", values_json: [""]});
                }
            }
        }

        function saveVariables() {
            var isEmptyVariableName = false,
                row;
            _.each(vm.variables, function(variable, index) {
                if (_.isEmpty(_.trim(variable.name))) {
                    row = index;
                    isEmptyVariableName = true;
                    return false;
                }
            });
            if (isEmptyVariableName) {
                DialogService.confirm("第" + (row + 1) + "行参数名不能为空!")
            } else {
                if (!_validVariableName()) {
                    return;
                }
                // 用户没有选择当前值,默认第一个为当前值
                _.each(vm.variables, function(variable) {
                    if (_.isEmpty(_.trim(variable.value))) {
                        variable.value = variable.values_json[0] || "";
                    }
                });
                VariableService.saveVariables(key, vm.variables).then(function() {
                    $state.reload();
                })
            }
        }

        function deleteValue(pIndex, index) {
            DialogService.confirm("确定删除此参数值吗?").then(function() {
                var currentValue = vm.variables[pIndex].values_json[index];
                if (vm.variables[pIndex].value == currentValue) {
                    vm.variables[pIndex].value = vm.variables[pIndex].values_json[0] || "";
                }
                vm.variables[pIndex].values_json.splice(index, 1);
            })
        }

        function deleteVariables(index) {
            DialogService.confirm((_.isUndefined(index) ? "确定删除选中的参数吗?" : "确定删除此参数吗?") + "删除后请点击保存按钮进行保存!").then(function() {
                if (_.isUndefined(index)) {
                    _delete(vm.variables);
                    function _delete(variables) {
                        var index = _.findIndex(variables, {checked: true});
                        if (index > -1) {
                            vm.variables.splice(index, 1);
                            _delete(vm.variables);
                        }
                    }
                } else {
                    vm.variables.splice(index, 1);
                }
            })
        }

        function hasCheckedVariable() {
            var hasChecked = false;
            _.each(vm.variables, function(variable) {
                if (variable.checked) {
                    hasChecked = true;
                    return false;
                }
            });
            return hasChecked;
        }

        function _validVariableName(){
            var isValid = true,
                row;
            _.forEach(vm.variables, function(variable, index) {
                if (variable.name && !TESTCASE_ENUM.regular.varibale.test(variable.name)) {
                    row = index;
                    isValid = false;
                    return false;
                }
            });
            if (!isValid) {
                DialogService.alert("第"+ (row + 1) + "行参数名格式错误，" +"全局参数名必须以字母开头,可以由字母、数字和下划线组成!");
            }
            return isValid;
            // if(name && !TESTCASE_ENUM.regular.varibale.test(name)){
            //     DialogService.alert("全局参数名必须以字母开头,可以由字母、数字和下划线组成!").finally(function(){
            //         event.target.focus();
            //     })
            // }
        }
    }

})();
