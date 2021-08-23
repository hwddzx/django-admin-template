angular.module('rio.app')
    .provider("config", ['$base64', function ($base64) {

        var config = {};
        var PROFILE_SUFFIX = "/home/profile",
            RECHARGE_SUFFIX = "/home/order";

        try {
            config = window.config || {};
            _.extend(config, JSON.parse($base64.decode(decodeURIComponent(window.location.search.substr(1) || getCookieValue("site_profile")))));
        } catch (e) {
        }

        config.dtUrl = config.dt_site || config.urls.dt;
        config.dtProfileUrl = config.urls.dt + PROFILE_SUFFIX;
        config.rechargeUrl = config.urls.dt + RECHARGE_SUFFIX;

        config.isLab = function () {
            return config.releaseEnv == "lab";
        };

        return {
            config: config,
            getSentryDns: function () {
                return {
                        production: 'http://6031353cfbef454f909bd967c2a67893@sentry.testbird.io/103',
                        stage: 'http://a45f6f1976ff4ca8983daf09c04118b2@sentry.testbird.io/102',
                        test: 'http://e671ba02796d49379e20d03c23724d48@sentry.testbird.io/101'
                    }[config.releaseEnv] || '';
            },
            $get: function () {
                return config;
            }
        }

        //from http://stackoverflow.com/questions/5639346/
        function getCookieValue(a, b) {
            b = document.cookie.match('(^|;)\\s*' + a + '\\s*=\\s*([^;]+)');
            return b ? b.pop() : '';
        }

    }]);
