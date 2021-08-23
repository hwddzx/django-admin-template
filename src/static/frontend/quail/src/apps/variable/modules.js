(function() {
    angular.module('quail.variable', [])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider.state("app.variable", {
                url: "/variable",
                templateUrl: 'apps/variable/templates/index.html',
                controller: 'variableCtrl',
                controllerAs: 'vm',
                resolve: {
                    variables: function($stateParams, VariableService) {
                        return VariableService.getVariables($stateParams.key).then(function(data) {
                            return data;
                        });
                    }
                }
            })
        }])
})();
