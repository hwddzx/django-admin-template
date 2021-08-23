(function() {
    angular.module("overview")
        .factory("OverviewService", OverviewService);

    function OverviewService($q, $http) {
        return {
            getAppOverview: function(appKey, params) {
                /*return $q.when({
                        key: 3,
                        icon_url: "http://file.lab.tb/upload/app_ff025285d381f7143eba9d4024bae4a1_787d76092762fe029880638ac1ea2cd2.png",
                        app_name: "广发证券",
                        owner: "jiangdeyang2@testbird.com",
                        version: "1.0",
                        total_testcases: 100,
                        completed_testcases: 50,
                        uncompleted_testcases: 50,
                        start_date: "2018-07-30",
                        end_date: "2018-07-30",
                        success_executions: 20,
                        blocked_executions: 20,
                        failed_executions: 60,
                        total_executions: 100,

                        patched_executions: 12,
                        tasks: [{
                            'name': "a1",
                            'created': "2018-07-31",
                            'total': 100,
                            'success_count': 1,
                            'blocked_count': 1,
                            'failed_count': 1,
                            'patched_count': 1,
                            'report_url': ""
                        },
                        {
                            'name': "a2",
                            'created': "2018-07-32",
                            'total': 100,
                            'success_count': 1,
                            'blocked_count': 1,
                            'failed_count': 1,
                            'patched_count': 1,
                            'report_url': ""
                        },
                        {
                            'name': "a3",
                            'created': "2018-07-33",
                            'total': 100,
                            'success_count': 1,
                            'blocked_count': 1,
                            'failed_count': 1,
                            'patched_count': 1,
                            'report_url': ""
                        },{
                            'name': "a4",
                            'created': "2018-07-34",
                            'total': 100,
                            'success_count': 1,
                            'blocked_count': 1,
                            'failed_count': 1,
                            'patched_count': 1,
                            'report_url': ""
                        }]
                    });*/
                return $http.get("/api/app/"+appKey+"/related/info/", {params: params}).then(function(res) {
                    return res.data;
                })
            }
        }
    }
})();