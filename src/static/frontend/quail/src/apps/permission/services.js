(function() {
    angular.module("permission")
        .factory("PermissionService", PermissionService);

    function PermissionService($q, $http) {
        return {
            getAllUser: function() {
                return $http.get("/api/customer/list/v2/").then(function(res) {
                    return res.data;
                })
            },
            getUserList: function(appKey) {
                return $http.get("/api/app/" + appKey + "/user/action/").then(function(res) {
                    return res.data;
                })
            },
            getUserInfo: function(appKey, params) {
                return $http.get("/api/app/" + appKey + "/user/permission/", {params: params}).then(function(res) {
                    return res.data;
                })
            },
            addUser: function(appKey, params) {
                //return $q.when({name: "ccc", email: "jiang2@testbird.com", id: 3});
                return $http.post("/api/app/" + appKey + "/user/permission/", params).then(function(res) {
                    return res.data;
                })
            },
            settingPermission: function(appKey, params) {
                //return $.when();
                return $http.post("/api/app/" + appKey + "/user/permission/action/", params).then(function(res) {
                    return res.data;
                })
            },
            deleteUser: function(appKey, params) {
                return $http.delete("/api/app/" + appKey + "/user/permission/action/", {data: params}).then(function(res) {
                    return res.data;
                })
            }
        }
    }
})();