(function() {
    angular.module("preview")
        .factory("PreviewService", PreviewService);

    function PreviewService($q, $http) {
        return {
            getUserPreview: function(appKey, params) {
                /*return $q.when({
                    'completed_testcases': 10,
                    'total_testcases': 100,
                    'uncompleted_testcases':90,
                    icon_url: "http://file.lab.tb/upload/app_ff025285d381f7143eba9d4024bae4a1_787d76092762fe029880638ac1ea2cd2.png",
                    app_name: "兴业证券",
                    version: "1.0",
                    'scenarios': [
                    {
                        permission: "修改",
                        "code": "",
                        "is_distributed": false,
                        "name": "智慧管家",
                        "expanding_dim": 0,
                        "tags": [],
                        "fast_mode": false,
                        "parent_id": null,
                        "version": null,
                        "script_status": 0,
                        "has_script": false,
                        "is_submitted": false,
                        "completed_count":1,
                        'total_count': 2,
                        "type": 1,
                        "id": 4
                    }, {
                        permission: "查看",
                        "code": "",
                        "is_distributed": false,
                        "name": "新增场景1",
                        "expanding_dim": 0,
                        "tags": [],
                        "fast_mode": false,
                        "parent_id": 4,
                        "version": null,
                        "script_status": 0,
                        "has_script": false,
                        "is_submitted": false,
                            "completed_count":1,
                        'total_count': 2,
                        "type": 1,
                        "id": 32
                    }],
                    'testcase_progresses':[
                        {
                            'name': 'test',
                            email: 'jdy@testbird.com',
                            'parent_id': 'id',
                            'type': 1,
                            'id': 2,
                            'script_status': 1,
                            'completed_count': 2,
                            'total_count': 2,
                            'permission': '查看'
                    },
                        {
                            'name': 'test',
                            email: 'jdy@testbird.com',
                            'parent_id': 'id',
                            'type': 1,
                            'id': 2,
                            'script_status': 1,
                            'completed_count': 2,
                            'total_count': 2,
                            'permission': '查看'
                    }
                    ]
                });*/

                return $http.get("/api/testcase/app/" + appKey + "/progress/", {params: params}).then(function(res) {
                    res.data.uncompleted_testcases = res.data.total_testcases - res.data.completed_testcases;
                    return res.data;
                })
            }
        }
    }
})();