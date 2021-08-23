(function() {
    angular.module("plugin")
        .factory("pluginService", pluginService);

    function pluginService($q, $http) {
        return {
            getPlugins: function(key) {
                return $http.get("/api/testcase/app/" + key + "/plugin/").then(function(res) {
                    return res.data;
                })
            },
            uploadPlugin: function(key, params) {
                return $http.post("/api/testcase/app/" + key + "/plugin/", params).then(function(res) {
                    return res.data;
                })
            },
            updatePlugin: function(id, params) {
                return $http.post("/api/testcase/plugin/" + id + "/", params).then(function(res) {
                    return res.data;
                })
            },
            deletePlugin: function(id) {
                return $http.delete("/api/testcase/plugin/" + id + "/").then(function(res) {
                    return res.data;
                })
            },
            getPluginParams: function(blob) {
                return _getFileMap(blob).then(function(readers, fileMap) {
                    var readme = fileMap['readme.txt'] || fileMap['plugin/readme.txt'];
                    if (!_.isEmpty(readme)) {
                        return _getParamsByFileEntry(readme).then(function(text) {
                            return text && text.replace(/\n/g, "<br/>");
                        })
                    }

                });

                function _getFileMap(blob) {
                    var deferred = $.Deferred();
                    zip.createReader(new zip.BlobReader(blob), function(reader) {
                        var fileMap = {};
                        reader.getEntries(function(entries) {
                            entries.forEach(function(entry) {
                                fileMap[entry.filename] = entry;
                            });
                            deferred.resolve(reader, fileMap);
                        });
                    }, function() {
                        deferred.reject();
                    });
                    return deferred.promise();
                }

                function _getParamsByFileEntry(fileEntry) {
                    var deferred = $.Deferred();
                    fileEntry.getData(new zip.BlobWriter(), function(blob) {
                        var reader = new FileReader();
                        reader.onload = function() {
                            deferred.resolve(this.result);
                        };
                        reader.onerror = function(e) {
                            deferred.reject(e);
                        };
                        reader.readAsText(blob);
                    });
                    return deferred.promise();
                }
            }
        }
    }
})();