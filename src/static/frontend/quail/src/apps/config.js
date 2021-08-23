angular.module('quail.main')
    .provider("config", ['TbBase64', function(TbBase64) {

        var config = {},
            CONFIG_PREFIX = "?config=",
            PROFILE_SUFFIX = "/home/profile",
            RECHARGE_SUFFIX = "/home/order";

        try {
            //支持"?config=basexxx","?basexxx",cookie 三种类型的profile参数
            var search = window.location.search,
                configStr = decodeURIComponent(search.substr(search.indexOf(CONFIG_PREFIX) > -1 ? 8 : 1) || getCookieValue("site_profile"));
            config = window.config || {};
            _.extend(config, JSON.parse(TbBase64.decode(configStr)));
        } catch (e) {}

        config.dtUrl = config.dt_site || config.urls.dt;
        config.dtProfileUrl = config.dtUrl + PROFILE_SUFFIX;
        config.rechargeUrl = config.dtUrl + RECHARGE_SUFFIX;

        //任务类型默认为game
        config.business = config.business|| 'game';

        config.isOffline = config.token === "offline_report";
        // config.isOffline = true;

        config.isPgyer = config.token === 'pgyer_report';

        config.isNoCache = config.no_cache;

        config.rioEnabled = config.isCNLocale = (config.locale == 'zh_CN');

        config.setBusiness = function(business) {
            config.business = business;
            config.isGame = business == "game";
            config.isApp = business == "app";
        }

        config.isLab = function() {
            return config.releaseEnv == "lab";
        };

        return {
            config: config,
            getSentryDns: function() {
                return {
                    production: 'http://fc597653d83c4b33979732d625b224b2@sentry.testbird.io/106',
                    stage: 'http://8ff69725a79d4fb8b57685e7e9c950a7@sentry.testbird.io/105',
                    test: 'http://d9dc6fbed1d0424f8beeb6e5d534c283@sentry.testbird.io/104'
                }[config.releaseEnv] || '';
            },
            $get: function() {
                return config;
            }
        }

        //from http://stackoverflow.com/questions/5639346/
        function getCookieValue(a, b) {
            b = document.cookie.match('(^|;)\\s*' + a + '\\s*=\\s*([^;]+)');
            return b ? b.pop() : '';
        }

    }]);