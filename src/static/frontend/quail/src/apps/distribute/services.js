(function() {
    angular.module("distribute")
        .factory("DistributeService", DistributeService);

    function DistributeService($q, $http) {
        return {
            setCurrentGather:function(gather){
                this.gather = gather;
            },
            getCurrentGather:function(){
                return this.gather;
            },
            currentRelease:function(release){
                release && (this.release = release);
                return this.release;
            },
            setCurrentType:function(type){
                this.type = type;
            },
            getCurrentType:function(){
                return this.type;
            },
            getAppInfo: function(key) {
                return $http.get("/api/app/" + key + "/").then(function(res) {
                    return res.data;
                })
            },
            addMembers: function(key, params) {
                return $http.post("/api/app/" + key + "/members/", {members: params}).then(function(res){
                    return res.data;
                });
            },
            deleteMembers: function(key, params) {
                return $http.delete("/api/app/" + key + "/members/", {data: {members: params}});
            },
            getGathers: function(releaseId, params) {
                return $http.get("/api/testcase/release/" + releaseId + "/testsuite/", {params: params}).then(function(res) {
                    return res.data;
                })
            },
            createGather: function(releaseId, params) {
                return $http.post("/api/testcase/release/" + releaseId + "/testsuite/", params).then(function(res) {
                    return res.data;
                });
            },
            deleteGather: function(gatherKey) {
                return $http.delete("/api/testcase/testsuite/" + gatherKey + "/");
            },
            updateGather: function(gatherKey, params) {
                return $http.post("/api/testcase/testsuite/" + gatherKey + "/", params).then(function(res) {
                    return res.data;
                })
            },
            getTestCases: function(gatherKey) {
                return $http.get("/api/testcase/testsuite/" + gatherKey + "/").then(function(res) {
                    return res.data;
                })
            },
            distributeTask: function(key, gatherKey, params) {
                return $http.post("/api/task/testsuite/" + gatherKey + "/distribute/", params);
            },
            redistributeExecutions: function(gatherKey, params) {
                return $http.post("/api/task/testsuite/" + gatherKey + "/execution/", params);
            },
            getGatherExecutions: function(gatherKey, params) {
                return $http.get("/api/task/testsuite/" + gatherKey + "/execution/", {params: params}).then(function(res) {
                    return res.data;
                })
            }

        }
    }
})();