(function() {
    angular.module("testcase.component")
        .factory("componentService", componentService);

    function componentService($q, $http, TestCaseService, config) {
        return {
            copyScript: function(id, name) {
                return $http.post("/api/testcase/component/" + id + "/copy/", {
                    name: name
                }).then(function(res) {
                    return res.data;
                })
            },
            getComponents: function(key) {
                return $http.get("/api/testcase/app/" + key + "/component/").then(function(res) {
                    return res.data;
                })
            },
            getComponent: function(id) {
                return $http.get("/api/testcase/component/" + id + "/").then(function(res) {
                    config.url_prefix = res.data.url_prefix;
                    return res.data;
                })
            },
            saveComponent: function(key, data) {
                return $http.post("/api/testcase/app/" + key + "/component/", {components: data}).then(function(res) {
                    return res.data;
                });
            },
            updateComponent: function(data) {
                data.snapshots && TestCaseService.reConfigScriptJson(data.snapshots, data.script_json, true);
                return $http.post("/api/testcase/component/" + data.id + "/", data).then(function(res) {
                    return res.data;
                });
            },
            deleteComponent: function(id) {
                return $http.delete("/api/testcase/component/" + id + "/").then(function(res) {
                    return res.data;
                });
            },
            moveComponent: function(param) {
                return $http.post("/api/testcase/component/" + param.ids[0] + "/", param);
            }
        };
    }

})();