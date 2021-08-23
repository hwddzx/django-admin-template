(function () {
    angular.module("scan")
        .factory("ScanService", ScanService);

    function ScanService($q, $http, DialogService, UploadService, FileService, SCAN_ENUM, TbUUID) {
        var safeFilters = {
            low: {
                value: true,
                text: 'Low'
            },
            medium: {
                value: true,
                text: 'Medium'
            },
            high: {
                value: true,
                text: 'High'
            }
        }

        var scantaskFilters = {
            scanTypes: [
                {
                    id: 0,
                    name: '敏感词扫描'
                },
                {
                    id: 1,
                    name: '三方库安全扫描'
                }
            ],
            levels: [
                {
                    id: 'Low',
                    name: 'Low'
                },
                {
                    id: 'Medium',
                    name: 'Medium'
                },
                {
                    id: 'High',
                    name: 'High'
                }
            ]
        }

        var service = {
            safeFilters: safeFilters,
            scantaskFilters: scantaskFilters,
            getScantasks: getScantasks,
            updateScantask: updateScantask,
            getRunningCount: getRunningCount,
            scan: scan,
            stopScantask: stopScantask,
            isSelectedSensitive: isSelectedSensitive,
            isSelectedSafe: isSelectedSafe,
            readFile: readFile,
            uploadZip: uploadZip,
            getScanExecutions: getScanExecutions,
            initIgnoredExceptions: initIgnoredExceptions,
            getScanDetail: getScanDetail,
            getSensitiveItems: getSensitiveItems,
            initSelectedScantypes: initSelectedScantypes,
            initSelectedSensitives: initSelectedSensitives,
            initSelectedLevels: initSelectedLevels,
            getResultFile: getResultFile,
            initSensitiveExceptions: initSensitiveExceptions,
            initSafeExceptions: initSafeExceptions,
            ignoreException: ignoreException,
            exportExcel: exportExcel,
            deleteIgnoredException: deleteIgnoredException
        }

        return service;

        function getScantasks(params) {
            return $http.get("/api/scanner/scantask/list/", {params: params}).then(function (res) {
                var scantasks = res.data;
                scantasks = _.sortBy(scantasks, function(task) {
                    return Number(task.latest_scan_time);
                });
                return _.reverse(scantasks);
            });
        }

        function getRunningCount(tasks) {
            var count = 0
            _.forEach(tasks, function(task) {
                count += task.running_count;
            });
            return count;
        }

        function updateScantask(scantask) {
            var params = {
                name: scantask.name,
                type: _.chain(scantask.selectedScantypes).map('id').value(),
                sensitives: _.chain(scantask.selectedSensitives).map('id').value(),
                filename: scantask.filename,
                repertory: scantask.repertory
            }
            if (_.find(scantask.selectedScantypes, function(type) { return type.id == SCAN_ENUM.scanType.sensitive; })) {
                _.extend(params, {
                    ignore_files: scantask.ignore_files.split(','),
                    ignore_keywords: scantask.ignore_keywords.split(','),
                    ignore_comment_lines: scantask.ignore_comment_lines == '1' ? true : false
                });
            }
            if (_.find(scantask.selectedScantypes, function(type) { return type.id == SCAN_ENUM.scanType.safe; })) {
                _.extend(params, {
                    dependency_ignore_files: scantask.dependency_ignore_files,
                    dependency_ignore_vulnerabilities: scantask.dependency_ignore_vulnerabilities,
                    dependency_ignore_severities: _.chain(scantask.selectedLevels).map('id').value().join(',')
                });
            }
            return $http.post("/api/scanner/scantask/" + scantask.key + "/", params);
        }

        function scan(scantask) {
            return $http.post("/api/scanner/scantask/" + scantask.key + "/start/");
        }

        function stopScantask(scantask) {
            return $http.post("/api/scanner/scantask/" + scantask.key + "/stop/");
        }

        function isSelectedSensitive(types) {
            return _.find(types, function(type) { return type == SCAN_ENUM.scanType.sensitive; }) === SCAN_ENUM.scanType.sensitive;
        }

        function isSelectedSafe(types) {
            return _.find(types, function(type) { return type == SCAN_ENUM.scanType.safe; });
        }

        function readFile(files) {
            if (files.length > 0) {
                var file = files[0];

                var strArr = file.name.split(".");

                if (strArr.length > 1 && strArr[strArr.length - 1] != "zip") {
                    DialogService.alert("文件扩展名只能是zip！");
                    return;
                }

                return $q.when(file);
            }
        }

        function uploadZip(file) {
            return UploadService.upload(file, UploadService.getFileKey(file, "zip")).then(function (url) {
                return url;
            });
        }

        function getScanExecutions(scantaskKey, params) {
            return $http.get("/api/scanner/scantask/" + scantaskKey + "/execution/list/", {params: params}).then(function (res) {
                return res.data;
            });
        }

        function initIgnoredExceptions(exceptions) {
            var result = [];
            _.forIn(exceptions, function (value, key) {
                result.push(_.extend(value, {
                    key: key,
                    showCode: false
                }));
            });
            return result;
        }

        function getScanDetail(executionKey) {
            return $http.get("/api/scanner/scan/execution/" + executionKey + "/").then(function (res) {
                return res.data;
            });
        }

        function getSensitiveItems() {
            return $http.get("/api/scanner/sensitive/list/").then(function (res) {
                return res.data;
            });
        }

        function getResultFile(url) {
            return $http.get(url, {
                withCredentials: false,
                headers: {
                    'Authorization': undefined,
                    'Token': undefined
                }
            }).then(function (res) {
                return res.data;
            });
        }

        function initSelectedScantypes(scantypes, typeItems) {
            var result = [];
            _.forEach(scantypes, function (value) {
                _.forEach(typeItems, function (item) {
                    if (value == item.id) {
                        result.push(item);
                    }
                });
            });
            return result;
        }

        function initSelectedSensitives(sensitives, sensitiveItems) {
            var result = [];
            _.forEach(sensitives, function (value) {
                _.forEach(sensitiveItems, function (item) {
                    if (value == item.id) {
                        result.push(item);
                    }
                });
            });
            return result;
        }

        function initSelectedLevels(sensitives, levelItems) {
            var result = [];
            _.forEach(sensitives, function (value) {
                _.forEach(levelItems, function (item) {
                    if (value == item.id) {
                        result.push(item);
                    }
                });
            });
            return result;
        }

        function initSensitiveExceptions(exceptions, ignoredExceptions) {
            _.forEach(ignoredExceptions, function(ignored) {
                _.remove(exceptions, function(entity) {
                    return entity.keyword == ignored.keyword
                        && entity.file == ignored.file
                        && entity.line == ignored.line
                        && _.difference(entity.beforeLines, ignored.beforeLines).length == 0
                        && _.difference(entity.afterLines, ignored.afterLines).length == 0
                        && entity.startPos == ignored.startPos;
                });
            });
            _.forEach(exceptions, function(exception) {
                var keyword = exception.line.substring(exception.startPos, exception.endPos);
                exception.lineStart = exception.line.substring(0, exception.startPos);
                exception.lineEnd = exception.line.substring(exception.endPos, exception.line.length);
                exception.lineRed = "<span style='color:red'>" + keyword + "</span>";
                exception.showCode = false;
            });
            return exceptions;
        }

        function initSafeExceptions(exceptions, ignoredExceptions) {
            _.forEach(ignoredExceptions, function (ignored) {
                _.remove(exceptions, function(entity) {
                    return entity.file == ignored.file
                        && entity.CWE == ignored.CWE
                        && entity.severity == ignored.severity
                        && entity.vulnerability == ignored.vulnerability;
                });
            });
            _.forEach(exceptions, function(exception) {
                exception.showCode = false;
            })
            return exceptions;
        }

        function ignoreException(executionKey, exception, scanType) {
            var params = {
                add: {},
                scan_type: scanType
            }
            var key = TbUUID.getUUID();
            params.add[key] = exception;
            return $http.post("/api/scanner/scan/execution/" + executionKey + "/exception/action/", params).then(function() {
                return key;
            });
        }

        function deleteIgnoredException(executionKey, exception, scanType) {
            var params = {
                delete: exception.key,
                scan_type: scanType
            }
            return $http.post("/api/scanner/scan/execution/" + executionKey + "/exception/action/", params);
        }

        function exportExcel(executionKey, result) {
            var params = {
                result: result == '1' ? 1 : 0
            }
            return $http.post("/api/scanner/scan/execution/" + executionKey + "/excel/", params).then(function(res) {
                return FileService.downloadByUrl(res.data.url);
            });
        }
    }
})();