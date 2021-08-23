(function() {
    'use strict';

    var app = angular.module('rio.app', [
        'gettext',
        'base64',
        'ngAnimate',
        'ui.bootstrap',
        'ui.router',
        'ngCookies',
        'tb.ui',
        'device-list',
        'control-panes',
        'finance',
        'cfp.hotkeys',
        'stf',
        'qiniu.upload'
    ]);

    app.config(function($urlRouterProvider, $httpProvider, $locationProvider, configProvider, spinnerProvider, responseDataInterceptorProvider) {
        $httpProvider.defaults.withCredentials = true;

        //测试以及产品环境下grunt build会取消注释以启用html5模式的路由
        //$locationProvider.html5Mode(true)

        //避免devices state 加载失败时，循环load state
        $urlRouterProvider.otherwise(function($inject) {
            var $state = $inject.get("$state");
            $state.go("devices");
        });

        //replace to real url by grunt
        configProvider.config.releaseEnv = "##RELEASE_ENV";

        if (configProvider.config.isLab()) {
            window.ga = angular.noop;
        } else {
            Raven.config(configProvider.getSentryDns()).install();
            Raven.setUserContext(configProvider.config);

            window.onerror = function(message, url, lineNumber, column, stack) {
                Raven.captureMessage('window error', {
                    extra: {
                        message: message,
                        url: url,
                        lineNumber: lineNumber,
                        column: column,
                        stack: "" + stack
                    }
                });
            }
        }

        responseDataInterceptorProvider.disable();

        if (configProvider.config.token) {
            $httpProvider.defaults.headers.common['Authorization'] = 'Token ' + configProvider.config.token;
        }

        function getURLParameter(name) {
            return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null
        }

        // Enable Google Analytics with user-ID enabled
        if (!configProvider.config.is_sys) {
            if (configProvider.config.email) {
                ga('create', 'UA-72655530-1', 'auto', { 'userId': configProvider.config.email });
            } else {
                ga('create', 'UA-72655530-1', 'auto');
            }
            ga('set', 'forceSSL', true);
            ga('send', 'pageview');
        }
    });

    app.run(function($rootScope, config, spinner, $http) {

        $rootScope.config = config;
    })

})();
