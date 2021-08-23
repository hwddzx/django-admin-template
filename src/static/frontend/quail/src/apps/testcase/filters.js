(function() {
    angular.module('quail.main')
    .filter('linkByActionId', linkByActionId)
    .filter('pluginsFilter', pluginsFilter)
    .filter('snapshotsCount', snapshotsCount)
    .filter('linkUrlBySnapshot', linkUrlBySnapshot);

    function linkByActionId(config, TESTCASE_ENUM) {
        return function(actionId, type) {
            var hosts = {
                anchor: config.url_prefix.anchor_host,
                xml: config.url_prefix.layout_host,
                gesturesImg: config.url_prefix.image_host,
                originalImg: config.url_prefix.image_host,
                checkedImg: config.url_prefix.image_host
            };
            return _.URI.join(hosts[type], actionId + TESTCASE_ENUM.fileSuffix[type]);
        };
    }

    function pluginsFilter(PLUGIN_ENUM) {
        return function(plugins, filterType) {
            return _.filter(plugins, function(plugin) {
                //type字段不存在或者为-1时插件未分类，两种过滤条件下都返回
                return (_.isNumber(plugin.type) && plugin.type !== -1) ? plugin.type === PLUGIN_ENUM.pluginType[filterType] : true;
            });
        }
    }

    function snapshotsCount() {
        return function(snapshots) {
            if (_.isEmpty(snapshots)) return 0;
            return snapshots.length
        }
    }

    function linkUrlBySnapshot() {
        return function(snapshot, testcase) {
            if (snapshot.componentName) {
                var url_prefix = testcase.url_prefix,
                    baseName = snapshot.componentName.split("#")[0],
                    first_snapshot = _.find(testcase.component_values, function(value) {
                        return value.first_snapshot && value.first_snapshot.hasOwnProperty(baseName);
                    }),
                    key = first_snapshot ? first_snapshot.first_snapshot[baseName] : "";
                return url_prefix.image_host + key + ".jpg"
            } else {
                return snapshot.url;
            }
        }
    }
})();