(function() {
    angular.module("overview")
        .controller("OverviewController", OverviewController);

    function OverviewController($scope, config, $stateParams, DialogService, OverviewService, versions, overview) {
        var vm = this,
            appKey = $stateParams.appKey;

        vm.versions = versions;
        vm.selectVersionKey = "";
        vm.overview = overview;
        vm.dates = [
            {name: "天", value: 1},
            {name: "周", value: 7},
            {name: "月", value: 30},
            {name: "季", value: 90},
            {name: "年", value: 365}
        ];
        vm.date = $stateParams.date || {name: "周", value: 7};
        vm.format = "yyyy-MM-dd HH";
        vm.altInputFormats = ['yyyy-MM-dd HH'];
        vm.startPopup = {
            opened: false,
            date: _getDate().start_date
        };
        vm.endPopup = {
            opened: false,
            date: _getDate().end_date
        };

        vm.chooseDate = chooseDate;
        vm.hasUrl = hasUrl;
        vm.getAppsProgress = getAppsProgress;
        vm.openDatePicker = openDatePicker;


        function hasUrl(url){
            return _.includes(url, "http");
        }

        function chooseDate(date) {
            vm.date = date;

            vm.startPopup.date = _getDate().start_date;
            vm.endPopup.date = _getDate().end_date;
        }

        // 这儿的时间(date类型)是用来在界面上显示
        function _getDate() {
            return {
                start_date: new Date(new Date().getTime() - vm.date.value * 24 * 60 * 60 * 1000),
                end_date: new Date()
            }
        }

        // 这儿的时间(字符串类型)是用来传递过后端 // "2018-07-28 15"
        function _dateFormat(date) {
            return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours();
        }

        function getAppsProgress(selectVersionKey) {
            vm.selectVersionKey = selectVersionKey ? selectVersionKey : vm.selectVersionKey;
            if (!vm.startPopup.date || !vm.endPopup.date) return DialogService.alert("请选择正确的查询日期!");

            var params = {start_date: _dateFormat(vm.startPopup.date), end_date: _dateFormat(vm.endPopup.date)};
            if (vm.selectVersionKey) { params.version = vm.selectVersionKey; }

            return OverviewService.getAppOverview(appKey, params).then(function(data) {
                return vm.overview = data;
            });
        }

        function openDatePicker(popup) {
            vm[popup].opened = true;
        }
    }
})();