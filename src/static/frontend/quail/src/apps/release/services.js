(function() {

    angular.module('quail.release')
        .factory("ReleaseService", ReleaseService);

    function ReleaseService($rootScope, $q, $http, $uibModal, $state, config) {

        return {
            getReleases: function(appKey, params) {
                return $http.get("/api/app/" + appKey + "/release/", { params: params }).then(function(res) {
                    return res.data;
                })
            },
            deleteRelease: function(appKey, releaseKey) {
                return $http.delete("/api/app/" + appKey + "/release/", {data: {key: releaseKey}});
            },
            saveRelease: function(appKey, model) {
                return $http.post((config.isLab() ? "/api/app/" : "/dt/api/app/") + appKey + "/release/", model).then(function(res) {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'UserAction',
                        eventAction: 'release-create',
                        eventLabel: model.file_name
                    });
                    return res.data;
                })
            },
            updateRelease: function(releaseId, model) {
                return $http.put("/api/app/release/" + releaseId + "/", model);
            }
        }

    }

}());
