(function () {
    angular.module('report_v2')
        .controller('reportExceptionsCtrl', reportExceptionsCtrl);

    function reportExceptionsCtrl($scope, $translate, $uibModal, $stateParams, config, reportV2Service, overview, compatibility, subtasks) {
        var vm = this;
        vm.compatibility = compatibility;
        vm.subtypes = vm.compatibility.resultSubtypes;
        vm.testSteps = overview.test_steps;
        vm.sortedExceptionTypes = reportV2Service.getSortedExceptionTypes();
        vm.subtasks = _.filter(subtasks.subtasks, {is_passed: false});
        vm.exceptionDescFilters = _.chain(vm.subtasks).map('exception_desc').compact().uniq().value();
        vm.taskKey = $stateParams.key;
        vm.isOffline = config.isOffline;

        vm.filters = {
            logFilter: '',
            subtasksFilter: ''
        };

        vm.chooseFilter = function (filter, select) {
            vm.filters[filter] = select;
        }

        vm.rioEnabled = config.rioEnabled;
        vm.isOffline = config.isOffline;
    }
})();