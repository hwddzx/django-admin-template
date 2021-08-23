(function() {

    angular.module('quail.task')
        .factory("VariableService", VariableService);

    function VariableService($http, $q) {
        return {
            getVariables: function(key) {
                return $http.get("/api/app/" + key + "/global/variable/").then(function(res) {
                    return res.data;
                })
            },
            saveVariables: function(key, variables) {
                return $http.post("/api/app/" + key + "/global/variable/", {variables_list: variables});
            }
        }
    }

}());
