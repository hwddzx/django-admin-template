(function() {

        angular.module("quail.excel", [])
            .factory("FileService", FileService);

            function FileService($http, $q, DialogService, spinner) {

                var service = {
                    exportExcel: exportExcel,
                    readExcel: readExcel,
                    readAsText: readAsText,
                    readAsJson: readAsJson,
                    downloadText: downloadText,
                    downloadByUrl: downloadByUrl
                };
                return service;

                function readAsJson(file) {
                    return service.readAsText(file).then(function(text) {
                        return $q(function(resolve, reject){
                            try {
                                resolve(JSON.parse(text));
                            } catch (error) {
                                reject();
                            }
                        });
                    });
                }

                function readAsText(file) {
                    spinner.show();
                    return $q(function(resolve, reject){
                        try {
                            var reader = new FileReader();
                            reader.onload = function() {
                                resolve(this.result);
                                spinner.hide();
                            };
                            reader.onerror = function() {
                                reject();
                                spinner.hide();
                            }
                            reader.readAsText(file);
                        } catch (error) {
                            reject();
                            spinner.hide();
                        }
                    });
                }

                function exportExcel(name, excelSheet) {
                    if (excelSheet && excelSheet.length) {
                        JSExcel.saveAsXlsx(excelSheet, name);
                    }
                }

                function readExcel(file) {
                    if (!file) {
                        return $q.when();
                    }
                    spinner.show();
                    return $q(function(resolve, reject) {
                        try {
                            JSExcel.readAsJson(file).then(function(data) {
                                resolve(data[0]);
                            }, function() {
                                reject();
                            }).always(function() {
                                spinner.hide();
                            });
                        } catch (error) {
                            reject();
                            spinner.hide();
                        }
                    });
                }

                function downloadText(text, name) {
                    var fileBlob = new Blob([text], {type: 'text/plain'});
                    service.downloadByUrl(window.URL.createObjectURL(fileBlob), name);
                    
                }

                function downloadByUrl(url, name) {
                    var pom = document.createElement('a');
                    pom.setAttribute('href', url);
                    name && pom.setAttribute('download', name);
                    pom.dataset.downloadurl = ['text/plain', pom.download, pom.href].join(':');
                    document.body.appendChild(pom);
                    pom.click();
                    setTimeout(function(){
                        document.body.removeChild(pom);
                        window.URL.revokeObjectURL(url);  
                    }, 100);  
                }
            }
    })();