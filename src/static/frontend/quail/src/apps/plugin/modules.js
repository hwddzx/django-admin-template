(function() {
    angular.module("plugin", [])
        .config(function($stateProvider) {
            $stateProvider
                .state("app.plugin", {
                    url: "/plugin",
                    templateUrl: "apps/plugin/templates/index.html",
                    controller: "pluginController",
                    controllerAs: "vm",
                    resolve: {
                        plugins: function($stateParams, pluginService) {
                            return pluginService.getPlugins($stateParams.key).then(function(data) {
                                return data;
                            })
                        }
                    }
                })
        })
        .constant("PLUGIN_ENUM", {
            typeText: {
                "0": "手机端执行插件",
                "1": "工控机端执行插件",
                "-1": ""
            },
            pluginType: {
                "plugin-tc": 1,
                "plugin-dev": 0
            }
        })
})();