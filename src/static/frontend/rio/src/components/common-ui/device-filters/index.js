angular.module("stf.device-filters", [])
    .directive("deviceFilters", function() {


        return {
            templateUrl: 'components/common-ui/device-filters/filters.html',
            replace: true,
            scope: {
                filters: '='
            },
            controller: function($scope) {
                $scope.toggleMultMode = function(filter) {
                    filter.multMode = !filter.multMode;
                    angular.forEach($scope.filters, function(item) {
                        if (filter != item) {
                            $scope.cancelMultSelect(item);
                        }
                    });
                };
                
                var params = {page: 1,page_size: 16,manufacturer:[],os:[],screen:[]};
                $scope.toggleFilterItem = function(item, filter) {  
                    console.log('arguments filtersss');
                    console.log(arguments);
                    if (filter.multMode) {
                        item.multSelected = !item.multSelected;
                        if (item.multSelected) {
                            filter.multSelected.unshift(item);
                        } else {
                            _.remove(filter.multSelected, function(entity) {
                                return entity.value === item.value;
                            });
                        }
                    } else {
                        item.selected = !item.selected;
                        if (item.selected) {
                            if(filter.key == 'status'){
                                filter.selected.unshift(item);
                                _.forEach(filter.items, function (data) {
                                    if(data.value != item.value){
                                        data.selected = false;
                                    }
                                });
                            }else{
                                filter.selected.unshift(item);
                            }
                        } else {
                            _.remove(filter.selected, function(entity) {
                                return entity.value === item.value;
                            });
                        }
                    }

                    angular.forEach(filter.selected, function(val) {
                        if(filter.key == "manufacturer" && val.selected == true){
                            params.manufacturer.push(val.value);
                        }else if((filter.key == "android" || filter.key == "harmony" || filter.key == "ios") && val.selected == true){
                            params.os.push(val.value);
                        }else if(filter.key == 'resolution' && val.selected == true){
                            params.screen.push(val.value);
                        }else if(filter.key == 'status' && val.selected == true){
                            if(val.value == '空闲'){
                                params.state = '0'
                            }else if(val.value == '离线'){
                                params.state = '3'
                            }else if (val.value == '租用中'){
                                params.state = '4'
                            }else if(val.value == '热门租用机型'){
                                params.state = 'hot'
                            }
                        }
                    });

                    // params.manufacturer = [...new Set(params.manufacturer)]
                    // params.os = [...new Set(params.os)]
                    // params.screen = [...new Set(params.screen)]
                    // params.manufacturer.filter((item, index, arr) => {
                    //     return arr.indexOf(item) === index
                    // })
                    var newArr = []
                    for (var i = 0; i < params.manufacturer.length; i++) {
                        if (newArr.indexOf(params.manufacturer[i]) == -1) {
                            newArr.push(params.manufacturer[i])
                        }
                    }
                    params.manufacturer = newArr;

                    var newArr1 = []
                    for (var i = 0; i < params.os.length; i++) {
                        if (newArr1.indexOf(params.os[i]) == -1) {
                            newArr1.push(params.os[i])
                        }
                    }
                    params.os = newArr1;

                    var newArr2 = []
                    for (var i = 0; i < params.screen.length; i++) {
                        if (newArr2.indexOf(params.screen[i]) == -1) {
                            newArr2.push(params.screen[i])
                        }
                    }
                    params.screen = newArr2;

                    if(filter.key == "manufacturer" && item.selected == false){
                        for (var i = 0; i < params.manufacturer.length; i++) {
                            if (params.manufacturer[i] == item.value) {
                                params.manufacturer.splice(i, 1)
                                i--;
                            }
                        }
                    } else if ((filter.key == "android" || filter.key == "harmony" || filter.key == "ios") && item.selected == false) {
                        for (var _i = 0; _i < params.os.length; _i++) {
                            if (params.os[_i] == item.value) {
                                params.os.splice(_i, 1);
                                _i--;
                            }
                        }
                    } else if (filter.key == "resolution" && item.selected == false) {
                        for (var _i2 = 0; _i2 < params.screen.length; _i2++) {
                            if (params.screen[_i2] == item.value) {
                                params.screen.splice(_i2, 1);
                                _i2--;
                            }
                        }
                    } else if (filter.key == "status" && item.selected == false) {
                        params.state = null
                    }
                    $scope.$emit('searchFiltersForDevives',params);
                }

                $scope.systemFilter = function(filter,data){
                    filter.selectedSystem = data;
                };
            
                $scope.toggleShowmore = function(filter) {
                    filter.showmore = !filter.showmore;
                };

                $scope.cancelMultSelect = function(filter) {
                    filter.multMode = false;
                    angular.forEach(filter.multSelected, function(item) {
                        item.multSelected = false;
                    });
                    filter.multSelected = [];
                };

                $scope.submitMultSelect = function(filter) {
                    filter.multMode = false;
                    angular.forEach(filter.selected, function(item) {
                        item.selected = false;
                    });
                    filter.selected = [];
                    angular.forEach(filter.multSelected, function(item) {
                        item.multSelected = false;
                        item.selected = true;
                        filter.selected.push(item);
                    });
                    filter.multSelected = [];
                };

                $scope.isItemSelected = function(item, filter) {
                    return filter.multMode ? item.multSelected : item.selected;
                };

                $scope.removeSelectedItem = function(selectedItem, filter, $event) {
                    $event.stopPropagation();
                    $event.preventDefault();
                    selectedItem.selected = false;
                    _.remove(filter.selected, function(entity) {
                        return entity.value === selectedItem.value;
                    });
                };

                $scope.hasItemSelected = function() {
                    var hasItem = false;
                    angular.forEach($scope.filters, function(filter) {
                        if (filter.selected.length) {
                            hasItem = true;
                        }
                    })
                    return hasItem;
                };
            }
        }

    });
