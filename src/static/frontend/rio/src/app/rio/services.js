(function() {

    angular.module('rio.app')
        .factory("RioService", RioService);


    function RioService($q, $http, $state, $filter, $uibModal, RentModalService, responseInterceptor, config) {

        var rioDevice = {
            duration: 0
        };

        return {

            showRentModal: function(device) {
                var self = this;
                if (!this.isDeviceLocked(device)) {
                    RentModalService.open(device).result.then(function(data) {
                        self.gotoDevicePage(data.device, data.minutes);
                        ga('send', {
                            hitType: 'event',
                            eventCategory: 'UserAction',
                            eventAction: 'rent',
                            eventLabel: device.name
                        });
                    });
                }
            },

            gotoDevicePage: function(device, minutes) {
                this.setCurrentRioDevice(device);
                device.duration = (minutes || 0) * 60;
                $state.go("device", {
                    key: device.key
                }, {
                    reload: true
                });
            },

            isDeviceAvailable: function(device) {
                return device.status == 0;
            },

            isDeviceLocked: function(device) {
                return device.status != undefined && device.status != 0;
            },

            isDeviceOutStock: function(device) {
                return device.status == undefined;
            },

            setCurrentRioDevice: function(device) {
                rioDevice = device;
            },

            getCurrentRioDevice: function(key) {
                return rioDevice;
            },

            updateDeviceRuntimeInfo: function(device) {
                return $http.get("/api/rio/runtime/", {
                    params: {
                        device_key: device.serial
                    }
                }).then(function(res) {
                    return (device.runtime = res.data);
                });
            },

            getDevices: function(key, device) {
                return $http.get("/api/rio/devices/").then(function(res) {
                    res.data.mine = _.flatten([res.data.mine_in_use, res.data.mine_in_line]);
                    return res.data;
                });
            },
            fetchDevices: function(params){
                return $http.get("/api/rio/devices/v2/", {params: params}).then(function(res) {
                    return res.data;
                });
            },
            fetchSearchLists: function(){
                return $http.get("/api/rio/devices/search/params/").then(function(res) {
                    return res.data;
                });
            },
            fetchRentingDeviceLists: function(){
                return $http.get("/api/rio/rent/").then(function(res) {
                    return res.data;
                });
            },
            getCustomerInfo: function() {
                return $http.get("/api/customer/info/").then(function(res) {
                    return res.data;
                });
            },
            stopRent: function(key, reason) {
                return $http.post("/api/rio/rent/stop/", {
                    device_key: key,
                    locker_key: config.email,
                    reason: $filter("stopRentReason")(reason)
                });
            },
            getComptestPayDetail: function(name) {
                return $http.get("/api/rio/ct/rent/?device_name=" + name).then(function(res) {
                    return res.data.message;
                });
            },
            rentFromComptest: function(name) {
                return $http.post("/api/rio/ct/rent/", {
                    "device_name": name
                }, {
                    ignoreErrAlert: true
                }).then(function(res) {
                    return res.data.device_key;
                });
            },
            rent: function(device, duration) {
                //?????????url??????????????????????????????currentDevice???????????????????????????key???name??????
                rioDevice.key = device.key;

                if (duration !== undefined) {
                    rioDevice.duration = duration;
                }

                // return $q(function(resolve) {
                //     var data = {
                //         serial_no: '6326ec7c',
                //         public_ip: '127.0.0.1',
                //         public_port: 7100,
                //         time_left: 1800
                //     };
                //     rioDevice.serial = data.serial_no;
                //     rioDevice.host = 'http://' + data.public_ip + ':' + data.public_port;
                //     rioDevice.remainTime = data.time_left;
                //     //???????????????????????????
                //     rioDevice.duration = 0;
                //     resolve(rioDevice);
                // })

                return $http.post("/api/rio/rent/", {
                    "device_key": rioDevice.key,
                    "duration": rioDevice.duration,
                }, {ignoreErrHandler: true}).then(function(res) {
                    var data = res.data;
                    rioDevice.key = data.device_key;
                    rioDevice.name = data.device_name;
                    rioDevice.serial = data.serial_no;
                    rioDevice.public_ip = data.public_ip;
                    rioDevice.public_port = data.public_port;
                    rioDevice.host = 'http://' + data.public_ip + ':' + data.public_port;
                    rioDevice.remainTime = data.time_left;
                    rioDevice.isFirstRent = data.is_first_rent;
                    rioDevice.rentKey = data.rent_key;
                    //?????????????????????????????????
                    rioDevice.lastDuration = rioDevice.duration;
                    //???????????????????????????
                    rioDevice.duration = 0;
                    config.token = data.token;

                    return rioDevice;
                }).catch(function(res){
                    //1.???????????? 2.????????????
                    if (res.status == 400 && res.data.detail.non_field_errors[0].indexOf("????????????") >= 0) {
                        $uibModal.open({
                            templateUrl: 'app/device-list/templates/rent.confirm.modal.html',
                            controller: function($scope, $uibModalInstance) {
                                $scope.title = "????????????";
                                $scope.message = res.data.detail ? (res.data.detail.non_field_errors ? res.data.detail.non_field_errors[0] : res.data.detail) : res.data;
                                $scope.rechargeUrl = config.rechargeUrl;
                                $scope.cancel = function() {
                                    $uibModalInstance.dismiss();
                                };
                                $scope.recharge = function() {
                                    $uibModalInstance.close();
                                    $state.go("finance.order");
                                };
                            }
                        });
                        return $q.reject(res);
                    } else {
                        res.config.ignoreErrHandler = false;
                        return responseInterceptor.responseError(res);
                    }
                });
            },

            getSysConfig: function() {
                return $http.get("/api/foundation/sysconfig/").then(function(res) {
                    return res.data;
                });
            },

            maintainStfNotify: function(ip, port) {
                return $http.post("/api/rio/stf/maintain/", {
                    public_ip: ip,
                    port: port
                });
            },
            maintainDeviceNotify: function(key) {
                return $http.post("/api/rio/device/maintain/", {
                    device_key: key
                });
            },

            jwtValidate: function() {
                var self = this;
                return $http.get(rioDevice.host + "/app/api/v2/validate?jwt=" + config.token, {
                    ignoreErrHandler: true
                }).then(function(res) {
                    //??????????????????
                    if (!res.data.success) {
                        return $q.reject({
                            msg: "????????????????????????????????????!",
                            authFailed: true,
                            code: 'unavailable_token',
                            e: res
                        });
                    }
                }, function(rejection) {
                    //validate????????????????????????????????????stf????????????
                    self.maintainStfNotify(rioDevice.public_ip, rioDevice.public_port);
                    return $q.reject({
                        msg: "?????????????????????????????????!",
                        serverError: true,
                        code: 'stf_crash',
                        e: rejection
                    });
                })
            },

            getDeviceWebSocketUrl: function() {
                return $http.get(rioDevice.host + '/app/api/v2/state', {
                    ignoreErrHandler: true
                }).then(function(res) {
                    return res.data.state.config.websocketUrl
                }, function(rejection) {
                    if (rejection.status == 0) {
                        return $q.reject({
                            msg: "???????????????????????????????????????,?????????????????????chrome/firefox/ie???????????????!",
                            code: 'unsupport_browser',
                            e: rejection
                        });
                    } else {
                        return $q.reject(rejection)
                    }
                })
            },

            getCustomerDuration: function() {
                return $http.get("/api/customer/duration/").then(function(res) {
                    return res.data;
                });
            }
        }


    }


}());
