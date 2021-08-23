(function() {

    angular.module('quail.app')
        .factory("AppService", AppService);

    function AppService($http, $q, config, DialogService) {

        return {
            getAppList: function(app) {
                return $http.get("/api/app/", app ? { params: app } : {}).then(function(res) {
                    return res.data;
                });
            },
            saveApp: function(app) {
                return $http.post(config.isLab() ? "/api/app/" : "/dt/api/app/", app).then(function(res) {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'UserAction',
                        eventAction: 'app-create',
                        eventLabel: app.name
                    });
                    return res.data;
                });
            },
            deleteApp: function(id) {
                return $http.delete("/api/app/" + id + "/");
            },
            resignApp: function(params) {
                var extendParams;
                switch (params.signType) {
                    case 1:
                        extendParams = {
                            keystoreUrl: params.espresso_apk_url
                        };
                        break;
                    case 2:
                        extendParams = {
                            espressoApkUrl: params.espresso_apk_url
                        };
                        break;
                    case 3:
                        extendParams = {
                            obb_info: params.obb_info
                        };
                        break;
                }
                return $http.post("/api/resign/", _.extend({
                    type: params.signType,
                    apkUrl: params.download_url,
                    keystoreAlias: params.espresso_alias,
                    keystorePw: params.espresso_pwd
                }, extendParams), {
                    ignoreErrHandler: true,
                    ignoreSpinner: true
                }).then(function(res) {
                    if (res.data.result) return res.data;
                    return $q.reject(res.data);
                }).catch(function(data) {
                    DialogService.alert(data.detail || "签名失败!");
                    return $q.reject();
                })
            },
            getAppsProgress: function(params) {
                return $http.get("/api/app/related/list/", {params: params}).then(function(res) {
                    return res.data;
                })
            },
            sortApp: function(params){
                return $http.post("/api/app/related/list/", params).then(function(res) {
                    return res.data;
                })
            },
            getCustomerList: function() {
                return $http.get("/api/customer/management/").then(function(res){
                    return res.data;
                })
            },
            addCustomer: function(params) {
                return $http.post("/api/customer/management/", params).then(function(res){
                    return res.data;
                })
            },
            deleteCustomer: function(params) {
                return $http.delete("/api/customer/management/", {data: params}).then(function(res){
                    return res.data;
                });
            },
            getDevices: function() {
                return $http.get("/api/device/list/monitor/").then(function(res){
                    return res.data;
                });
            },
            getCompareList: function(page){
                return $http.get("/api/task/app/report/compare/list/?page="+page).then(function(res){
                    return res.data;
                });
            },
            getAppCompareList: function (appKey, page) {
                return $http.get("/api/task/app/"+appKey+"/report/v3/?page="+page).then(function(res){
                    return res.data;
                });
            },
            addCompareReport: function (params) {
                return $http.put("/api/task/app/report/compare/list/", params).then(function(res){
                    return res.data;
                });
            },
            getCompareReportList: function (page) {
                return $http.get("/api/task/report/compare/list/?page="+page).then(function(res){
                    return res.data;
                });
            },
            createCompareReport: function (params) {
                return $http.post("/api/task/report/compare/list/", params).then(function(res){
                    return res.data;
                });
            },
            deleteCompareReport: function (params) {
                return $http.delete("/api/task/report/compare/list/", params).then(function(res){
                    return res.data;
                });
            },
            deleteAppReport: function (params) {
                return $http.put("/api/task/app/report/compare/list", params).then(function(res){
                    return res.data;
                });
            },
            getCompareReportDetail: function (key) {
                return $http.get("/api/task/report/compare/"+key+"/detail/").then(function(res){
                    return res.data;
                });
            },
            getAppTasks: function (key, params) {
                return $http.get("/api/task/app/"+key+"/task/list", {params: params}).then(function(res){
                    return res.data;
                });
            }
        }

    }


}());
