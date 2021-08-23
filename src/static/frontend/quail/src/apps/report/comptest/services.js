(function() {

    angular.module("report_v2")
        .factory("reportV2Service", reportService)
        .factory("$translate", TranslateService);

    function reportService($http, $q, config) {
        var report = {},
            noCache = {};

        var sortedExceptionTypes = [{
            key: "5da7cc01277175f36c5242ca480ff3407a6978fd",
            name: "安装失败"
        }, {
            key: "f205e4512c8a6dec4b1b39338c6f9119f4c777af",
            name: "启动失败"
        }, {
            key: "a15719d323e66e6f36ad2179c38a575b7bfba5fe",
            name: "闪退"
        }, {
            key: "84f0a2685de0c8bd3d6445dcf326d20a8f3b0b03",
            name: "黑屏&白屏"
        }, {
            key: "9bdde4174bd891af1263839846beb053aedbbae1",
            name: "卡死"
        }, {
            key: "f0a32464e950b8cea252b7b40ff3bab11a63fef1",
            name: "卡顿"
        }, {
            key: "exception.connect",
            name: "连接异常"
        }, {
            key: "1d6805716612348cef9f90b1dc4d6df0bd1f76f7",
            name: "UI异常"
        }, {
            key: "text_error",
            name: "文本对比异常"
        }, {
            key: "c_or_i_click_exception",
            name: "控件或图像点击异常"
        },{
            key: "1f0ca92769d3c6d05085cf9a7d5a29f9510a961d",
            name: "其他异常"
        }];

        if (config.isNoCache) {
            noCache = {
                "_": new Date().getTime()
            };
        }

        var reportFetch = function(apiPath) {

            if (!report[apiPath]) {
                return $http.get(apiPath, {
                    params: noCache
                }).then(function(data) {
                    return report[apiPath] = data;
                });
            }
            return $q.when(report[apiPath]);
        };

        // 后台返回时间格式为"2015-04-07 11:47:53",highchart图X轴需要毫秒
        function _getTimeStamp(str) {
            if (typeof str != "string") {
                return str;
            }
            var arr = str.replace(/[\:\s]/g, '-').split("-"),
                now = new Date(Date.UTC(arr[0], arr[1] - 1, arr[2], arr[3] - 8, arr[4], arr[5]));
            return parseInt(now.getTime());
        }
        return {
            getSortedExceptionTypes: function() {
                return sortedExceptionTypes;
            },
            getOverview: function(key) {
                return reportFetch("/api/task/" + key + "/ct_report/overview/").then(function(res) {
                    return res.data;
                });
            },
            getCompatibility: function(key) {
                var service = this;
                return reportFetch("/api/task/" + key + "/ct_report/compatibility/").then(function(res) {
                    //对result_json2.subtypes 按照：安装失败 启动失败 闪退 黑屏&白屏 卡死 卡顿 UI异常 其它异常排序
                    res.data.resultSubtypes = [];
                    _.each(service.getSortedExceptionTypes(), function(sort, index) {
                        // If can't find the sub type, add a default one with all data as 0
                        res.data.resultSubtypes.push(_.find(res.data.result_json2.subtypes, {key: sort.key})
                            || {key: sort.key, name: sort.name, rate: 0, count: 0, coverage_count: 0});
                    });
                    return res.data;
                });
            },
            getPerformance: function(key) {
                return reportFetch("/api/task/" + key + "/ct_report/performance/").then(function(res) {
                    return res.data;
                });
            },
            getSubtasks: function(key) {
                return reportFetch("/api/task/" + key + "/ct_report/execution/").then(function(res) {
                    //TODO: subtasks => executions
                    res.data.subtasks = res.data.executions;
                    return res.data;
                });
            },
            getSubtaskDetail: function(subtaskKey) {
                return reportFetch("/api/task/ct_report/execution/" + subtaskKey + "/").then(function(res) {
                    _.each(res.data.performances, function (performance, index) {
                        performance.millisecond = _getTimeStamp(performance.time);
                    });
                    return res.data;
                })
            },
            getReportShareURL: function(key) {
                return reportFetch('/api/task/' + key + '/ct_report/offline/url/').then(function(res) {
                    return res.data.url;
                })
            },
            getExcelExportURL: function(key) {
                return _.URI.join(config.urls.quail,"api/task/" + key + "/ct_report/export/excel/");
            },
            getMiniLogs: function(url,os) {
                var index=url.lastIndexOf("\/");
                var logName=url.substring(index+1,url.length-4)+'.log';
                if (!url) return $q.reject();
                if (!report[url]) {
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
                                var obj = {},
                                    arr = [];
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
                            });
                            var allLogs = _.remove(originalLogs, function(n) {
                              return JSON.stringify(n) != "{}";
                            });
                            return report[url] = allLogs;
                        })
                }
                return $q.when(report[url]);
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
                        marks.push({ index: index, logIndex: log.index })
                    })
                }
                return marks;
            },
            getSdkUrls: function(key) {
                if (config.isPgyer) {
                    return $q.when(null);
                }
                if (!_.isUndefined(report[key])) {
                    return $q.when(report[key]);
                }
                return $http.get(_.URI.join(config.urls.artisan.replace("http://", "https://"), 'api/app/' + key + '/sdk/'), {
                    withCredentials: false,
                    headers: {
                        'Authorization': undefined,
                        'Token': undefined
                    }
                }).then(function(res) {
                    return report[key] = res.data;
                });
            },
            rentDevice: function(id) {
                return $http.get('/api/task/execution/' + id + '/rio/rent/');
            }
        };
    }

    function TranslateService() {
        return {
            instant: function(key) {
                return {
                    "task_万": "万",
                    "T币": "元",
                    "Internal storage": "内存",
                    "Resolution": "分辨率",
                    "Issues": "待优化",
                    "Confirm": "确定",
                    "CPU Usage (%)": "CPU占用率(%)",
                    "Memory Usage (kb)": "内存占用(kb)",
                    "Available Memory Usage (kb)": "可用内存占用(kb)",
                    "Frame rate (fps)": "帧速率(fps)",
                    "Temperature (°C)": "温度(°C)",
                    "Data traffic(kb)": "流量(kb)",
                    "INSTALL": "安装",
                    "LAUNCH": "启动",
                    "RUN": "运行",
                    "Data Traffic": "流量",
                    "Booting Delay": "启动时延",
                    "CPU Utilization": "CPU占用率",
                    "Internal Storage Utilization": "内存占用",
                    "Temperature": "温度",
                    "Frame Rate": "帧速率",
                    "联系方式": "<div class=\"profile-info-head\">非付费用户只能使用基础测试，如有需要，请联系我们的销售人员</div><div class=\"profile-info-row\"><div class=\"profile-info-name\"> 西南商务 </div><div class=\"profile-info-value\"><span>153 2818 5669 - 刘先生</span></div> </div><div class=\"profile-info-row\"><div class=\"profile-info-name\"> 华北商务 </div><div class=\"profile-info-value\"><span>189 1080 4637 - 韩先生</span></div> </div><div class=\"profile-info-row\"><div class=\"profile-info-name\"> 华东商务 </div><div class=\"profile-info-value\"><span>138 1830 8032 - 沈先生</span></div> </div><div class=\"profile-info-row\"><div class=\"profile-info-name\"> 华南商务 </div><div class=\"profile-info-value\"><span>185 2333 4954 - 彭女士</span></div> </div><div class=\"profile-info-row\"><div class=\"profile-info-name\"> 客服电话 </div><div class=\"profile-info-value\"><span>028 61666170</span></div> </div><div class=\"profile-info-row\"><div class=\"profile-info-name\"> 服务邮箱 </div><a href=\"mailto:service@testbird.com\" class=\"profile-info-value\"><span>service@testbird.com</span></a> </div>",
                    "Mobile game testing": "手游测试",
                    "Application testing": "应用测试",
                    "My product": "我的产品",
                    "Run time": "新手引导",
                    "Personal Center": "个人中心",
                    "Exit system": "退出系统",
                    "Total": "不兼容",
                    "Coverage": "覆盖人群",
                    "Install": "安装",
                    "*10k": "万",
                    "Launch": "启动",
                    "Running": "运行",
                    "Load more devices": "加载更多",
                    "Cancel": "取消",
                    "Error": "错误",
                    "Warning": "警告",
                    "The CPU is the unit responsible for carrying out all instructions of an application and all the necessary instructions for running different subsystems that maintain running the Android OS (multimedia, audio, render, etc.)": "CPU是负责执行所有指令的应用程序和运行不同的子系统，维护运行的安卓系统（多媒体，音频，渲染等）的必要单元。",
                    "CPU Usage": "CPU占有率",
                    "When the CPU usage is high, the user may experience sluggishness or higher battery usage (among some other symptoms). Since the CPU usage is a shared resource, abuse of CPU usage may prevent other running services work incorrectly, affecting the user experience as the proper functioning of Android (and the applications that run there). With higher levels of instructions, the CPU increases its speed with a consequent increase in use of voltage that causes the battery to drain faster": "当CPU占用过高时，用户会感觉到应用卡顿、电量消耗过快、手机发烫等症状。同时由于CPU是应用和系统的共有资源，当一个应用过多的占用CPU时，势必会影响其他应用的运行，严重时，拖累整个系统的正常运行。",
                    "Memory": "内存",
                    "Memory Usage": "内存占用",
                    "To maintain a functional multi-tasking environment, Android sets a fixed limit on the Dalvik heap size for each app. The exact Dalvik heap size limit varies across devices, based on how much RAM the device has available overall. If your app has reached the heap capacity and tries to allocate more memory, it will receive an OutOfMemoryError.": "为了更好的运行多任务环境，android系统限制了每个应用可分配的堆的大小。具体的大小限制取决于手机设置。不同的厂商，不同的系统版本可能各异。如果应用占用的空间超过了限制，可能触发OutOfMemoryError",
                    "Render": "渲染",
                    "Render Time": "渲染时间",
                    "Performance Table": "性能图",
                    "Related ScreenShot": "相关截图",
                    "Raw Logs": "原始日志",
                    "All": "全部",
                    "NativeCrash": "本地崩溃",
                    "Fatal": "致命错误",
                    "ANR": "ANR",
                    "Exception": "异常",
                    "Failure": "失败",
                    "Performance": "性能",
                    "Others": "其他",
                    "PROBLEMSUMMARY": "问题汇总",
                    "No problem detected": "没有检测到问题",
                    "Priority consumer TPhone remaining time, if not enough to spend 100TBC/ hours.": "优先消费云手机机时, 如果机时不足将消费100TBC/小时. 点击确认。",
                    "Random-access memory (RAM) is one of the most valuable resource in any software development environment, but it's even more valuable on several mobile operating system where physical memory is constrained.": "RAM是任何软件开发环境中最有价值的资源之一，它的价值体现在物理内存收限制的系统中",
                    "When building an application, it's important to consider exactly what your graphical demands will be. Varying graphical tasks are best accomplished with varying techniques. For example, graphics and animations for a rather static application should be implemented much differently than graphics and animations for an interactive game. No matter what type of application it is, there are certain situations that affect the user experience (response rate, fluency, use of resources, battery etc.). Times drawn reflect possibly some things are not performing in the best possible shape for the type of service you want to provide with this.": "在构建应用程序时，需要着重考虑你的图形化需求将是什么。不同的图形化的任务用不同的技术来完成。例如，对于一个静态应用程序的图形和动画，应该用不同的图形和动画来实现，而不是一个交互式游戏。无论是什么类型的应用程序，在一定的情况下，影响用户体验（响应速度，流畅性，使用资源，电池等）。",
                    "To achieve fluid rendering (60 fps) each frame must be completed in less than 16ms. If not, application creates a disruption in the animation and sometimes it 'freeze'. Also, elevated drawing to the screen needs high CPU and/or GPU usage in order to maintain a constant rate, causing battery drain.": "实现流体渲染（60帧）每帧必须小于16ms完成。如果没有，程序创建动画的会出现卡顿现象。同时，为了提高屏幕渲染则需要保持较高的CPU和GPU使用率，同时又会造成电池消耗。"
                }[key];

            }
        }
    }

})();
