(function() {

    angular.module('quail.report')
        .factory("ExecutionDetailService", ExecutionDetailService);

    function ExecutionDetailService($http, $q) {

        return {
            // 用例详情信息
            getExecutionDetail: function(hashkey) {
                return $http.get("/api/task/execution/" + hashkey + "/").then(function(res) {
                    return res.data;
                });
            },
            getExecutionLog: function(url, startByte, endByte) {
                return $http.get("/api/task/execution/log/download/", { params: { file_url: url, from: startByte, to: endByte } }).then(function(res) {
                    return res.data;
                });
            },
            getMiniLogs: function(url, os) {
                var index=url.lastIndexOf("\/");
                var logName=url.substring(index+1,url.length-12)+'log';
                var promise = new JSZip.external.Promise(function (resolve, reject) {
                    JSZipUtils.getBinaryContent(url, function(err, data) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });
                return promise.then(JSZip.loadAsync)
                    .then(function(zip) {
                        return zip.file(logName).async("string");
                    })
                    .then(function success(text) {
                        var logs = _.split(text, '\n');
                        if (!logs[logs.length - 1]) {
                            logs.pop()
                        }
                        var originalLogs = _.map(logs, function(log, index) {
                            var obj = {}, arr = [];
                            if (os == "ios") {
                               arr = log.match(/([a-z,A-Z]+)\s*(\d{1,2})\s*(\d{1,2}):(\d{1,2}):(\d{1,2})\s*([a-z,A-Z,0-9,-]+)\s*([a-z,0-9,A-Z,.,\(,\),-]+)\s*(\[(.+?)\])\s*(\<.*>):\s*(.*)/)
                               if(arr){
                                    obj.index = index + 1;
                                    obj.time = arr[1] + " " + arr[2] + " " + arr[3] + ":" + arr[4] + ":" + arr[5];
                                    obj.level = "";
                                    obj.tag = arr[7];
                                    obj.pid = arr[9];
                                    obj.text = _.trim(arr[11]);
                               }
                               return obj;
                            }
                            arr = log.match(/(\d{1,2})-(\d{1,2})\s*(\d{1,2}):(\d{1,2}):(\d{1,2})\s*\.(\d{1,6})\s*([A-Z])\/(.+)\s*\(\s*(\d+)\):(.*)/);
                            if (arr) {
                                obj.index = index + 1;
                                obj.time = arr[1] + "-" + arr[2] + " " + arr[3] + ":" + arr[4] + ":" + arr[5];
                                obj.level = arr[7];
                                obj.tag = arr[8];
                                obj.pid = arr[9];
                                obj.text = _.trim(arr[10]);
                            }
                            return obj;
                        })
                        var allLogs = _.remove(originalLogs, function(n) {
                            return JSON.stringify(n) != "{}";
                        });
                        return allLogs;
                    })
            },
            searchMiniLogs: function(searchText, filtedLogs, isCaseSensitive) {
                var marks = [],
                    regExp;
                if (searchText) {
                    if (isCaseSensitive) {
                        regExp = new RegExp(searchText);
                    } else {
                        regExp = new RegExp(searchText, 'i')
                    }
                    _.each(filtedLogs, function(log, index) {
                        var matchLog = log.text.match(regExp);
                        if (!matchLog) {
                            return
                        }
                        marks.push({index: index, logIndex: log.index})
                    })
                }
                return marks;
            },
            getPatchedSnapshots: function(executionId) {
                return $http.get("/api/task/execution/" + executionId + "/snapshot/", { params: { patched: true } }).then(function(res) {
                    return res.data;
                });
            },
            deleteSnapshotPatch: function(execution, snapshot) {
                return this.deleteSnapshot(execution, snapshot.patch.key);
            },
            deleteSnapshot: function(execution, key) {
                return $http.delete("/api/task/execution/" + execution.id + "/snapshot/" + key + "/", { data: {} });
            },
            updateCompare: function(data) {
                return $http.put("/api/task/execution/" + data.executionId + "/snapshot/" + data.snapshotKey + '/', { "update_baseline": data.updateBaseline });
            },
            updateLayout: function(executionId, param) {
                return $http.post("/api/task/execution/" + executionId + "/xpath/refresh/", {refreshes: param}).then(function(res) {
                    return res.data;
                })
            },
            getIosNum: function(os) {
                return Number(os.split('ios')[1].split('.')[0]);
            },
            getSysConfig: function() {
                return $http.get("/api/foundation/sysconfig/").then(function(res) {
                    return res.data;
                });
            }
        }
    }

}());

