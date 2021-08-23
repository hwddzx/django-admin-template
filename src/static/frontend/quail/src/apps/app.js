(function() {
    'use strict';

    var app = angular.module('quail.main', [
        'base64',
        'gettext',
        'ngAnimate',
        'ui.bootstrap',
        'ngCookies',
        'ui.router',
        'angularFileUpload',
        'tb.ui',
        'quail.release',
        'quail.task',
        'quail.task.replay',
        'quail.report',
        'quail.rent-modal',
        'quail.tree',
        'quail.snapshot-slider',
        'quail.image-box',
        'quail.image-annotate',
        'quail.image-area',
        'quail.picture',
        'quail.layout',
        'quail.pagination',
        'quail.app',
        'control-panes',
        'report_v2',
        'stf',
        'quail.testcases',
        'distribute',
        'plugin',
        'testcase.component',
        'quail.variable',
        'quail.lab-drop-down',
        'permission',
        'overview',
        'statistics',
        'preview',
        'scan',
        'charts'
    ]);

    app.config(function($urlRouterProvider, $httpProvider, $locationProvider, $animateProvider, configProvider, spinnerProvider, responseDataInterceptorProvider) {
        $httpProvider.defaults.withCredentials = true;

        //测试以及产品环境下grunt build会取消注释以启用html5模式的路由
        //$locationProvider.html5Mode(true)

        //replace to real url by grunt
        configProvider.config.releaseEnv = "##RELEASE_ENV";

        configProvider.config.html5Mode = $locationProvider.html5Mode().enabled;

        $animateProvider.classNameFilter(/^(?:(?!ng-animate-disabled).)*$/);

        //避免state 加载失败时，循环load default state
        $urlRouterProvider.otherwise(function($inject) {
            var $state = $inject.get("$state");
            //默认跳转到app,app ctrl中会检测url中是否包含app_key,
            //如果不包含app_key则取最新的app.key,并跳转到app.testcases
            //私有云默认跳转到apps
            $state.go(configProvider.config.isLab() ? "apps" : "app");
        });

        responseDataInterceptorProvider.disable();

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
        if (configProvider.config.token) {
            $httpProvider.defaults.headers.common['Authorization'] = 'Token ' + configProvider.config.token;
        }
        $httpProvider.defaults.headers.delete = {
            'Content-Type': 'application/json'
        };

        function getURLParameter(name) {
            return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null
        }

        // Enable Google Analytics
        if (!configProvider.config.is_sys) {
            if (configProvider.config.email) {
                ga('create', 'UA-72655530-3', 'auto', {
                    'userId': configProvider.config.email,
                    'siteSpeedSampleRate': 20
                });

                // Customized dimension 1: Job Position
                ga('set', 'dimension1', configProvider.config.job_position);

                // Customized dimension 2: Company Size
                ga('set', 'dimension2', (typeof configProvider.config.company_size === "undefined" ? "" : configProvider.config.company_size));
            } else {
                ga('create', 'UA-72655530-3', 'auto');
            }
            ga('set', 'forceSSL', true);
        }

        Highcharts.setOptions({
            global: {
                useUTC: false
            }
        });
    });

    app.run(function($rootScope, spinner, config, TbUUID) {
        config.features = config.features || [];
        $rootScope.config = config;

        $rootScope.$on("$stateChangeSuccess", function(event, toState, toParams, fromState) {
            // 进入app列表界面或者上传app之后赋值一次AppUUID
            toState.name == "apps" && TbUUID.setAppUUID(TbUUID.getUUID());
            // 进入app子界面设置当前app的AppUUID
            toParams.key && TbUUID.setAppUUID(toParams.key);
            config.toState = toState;
            config.fromState = fromState;
            ga('send', 'pageview', '/' + toState.name);
        });
    })

})();
