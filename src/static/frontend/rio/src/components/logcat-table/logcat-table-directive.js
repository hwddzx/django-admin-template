angular.module('stf.logcat-table').directive('logcatTable', logcatTableDirective)

function logcatTableDirective($rootScope, $timeout, LogcatService) {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: "components/logcat-table/logcat-table.html",
        link: function(scope, element, attr) {
            var autoScroll = true
            var autoScrollDependingOnScrollPosition = true
            var scrollPosition = 0
            var scrollHeight = 0
            var parent = element[0]
            var body = element.find('tbody')[0]
            var maxEntriesBuffer = 1000
            var numberOfEntries = 0;

            (function () {
                if (attr.type == "ios") {
                    $(element).find('table').addClass("ios-message-text");
                }
            })();

            function incrementNumberEntry() {
                numberOfEntries++
                if (numberOfEntries > maxEntriesBuffer) {
                    scope.clearTable()
                }
            }

            LogcatService.addEntryListener = function(entry) {
                incrementNumberEntry()
                addRow(body, entry)
            }

            LogcatService.addFilteredEntriesListener = function(entries) {
                clearTable()
                    //var fragment = document.createDocumentFragment()
                _.each(entries, function(entry) {
                    // TODO: This is not adding all the entries after first scope creation
                    incrementNumberEntry()
                    addRow(body, entry, true)
                })
            }

            function shouldAutoScroll() {
                if (autoScrollDependingOnScrollPosition) {
                    return scrollPosition === scrollHeight
                } else {
                    return true
                }
            }

            function scrollListener(event) {
                scrollPosition = event.target.scrollTop + event.target.clientHeight
                scrollHeight = event.target.scrollHeight
            }

            var throttledScrollListener = _.throttle(scrollListener, 100)
            parent.addEventListener('scroll', throttledScrollListener, false)

            function scrollToBottom() {
                parent.scrollTop = parent.scrollHeight + 20
                $timeout(function() {
                    parent.scrollTop = parent.scrollHeight
                }, 10)
            }

            function addRow(rowParent, data, batchRequest) {
                var newRow = rowParent.insertRow(-1)

                newRow.classList.add('log-' + data.priorityLabel)

                //newRow.insertCell(-1)
                //  .appendChild(document.createTextNode(LogcatService.numberOfEntries))
                //newRow.insertCell(-1)
                //  .appendChild(document.createTextNode(data.deviceLabel))
                if (data.os != "ios") {
                    newRow.insertCell(-1)
                        .appendChild(document.createTextNode(data.priorityLabel))
                    newRow.insertCell(-1)
                        .appendChild(document.createTextNode(data.dateLabel))
                    if ($rootScope.platform === 'native') {
                        newRow.insertCell(-1)
                            .appendChild(document.createTextNode(data.pid))
                        newRow.insertCell(-1)
                            .appendChild(document.createTextNode(data.tid))
                        //newRow.insertCell(-1)
                        //  .appendChild(document.createTextNode(data.app))
                        newRow.insertCell(-1)
                            .appendChild(document.createTextNode(data.tag))
                    }
                }
                newRow.insertCell(-1)
                    .appendChild(document.createTextNode(data.message))

                if (autoScroll && shouldAutoScroll() && !batchRequest) {
                    _.throttle(scrollToBottom, 30)()
                }
            }

            function clearTable() {
                var oldBody = body
                var newBody = document.createElement('tbody')
                oldBody.parentNode.replaceChild(newBody, oldBody)
                body = newBody
            }
            
            scope.downloadlogRep = function() {
                var table = document.getElementById("logRep").innerHTML;

	  	        var excelFile = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>";  
                excelFile += '<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">';  
                excelFile += '<meta http-equiv="content-type" content="application/vnd.ms-excel';  
                excelFile += '; charset=UTF-8">';  
                excelFile += "<head>";  
                excelFile += "<!--[if gte mso 9]>";  
                excelFile += "<xml>";  
                excelFile += "<x:ExcelWorkbook>";  
                excelFile += "<x:ExcelWorksheets>";  
                excelFile += "<x:ExcelWorksheet>";  
                excelFile += "<x:Name>";  
                excelFile += "{worksheet}";  
                excelFile += "</x:Name>";  
                excelFile += "<x:WorksheetOptions>";  
                excelFile += "<x:DisplayGridlines/>";  
                excelFile += "</x:WorksheetOptions>";  
                excelFile += "</x:ExcelWorksheet>";  
                excelFile += "</x:ExcelWorksheets>";  
                excelFile += "</x:ExcelWorkbook>";  
                excelFile += "</xml>";  
                excelFile += "<![endif]-->";  
                excelFile += "</head>";  
                excelFile += "<body>";  
                excelFile += "<table>";  
                excelFile += table;  
                excelFile += "</table>";  
                excelFile += "</body>";  
                excelFile += "</html>";  
      
                  
                var uri = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(excelFile);  
                  
                var link = document.createElement("a");      
                link.href = uri;  
                  
                link.style = "visibility:hidden";  
                link.download = '当前日志文件' ;  //格式默认为.xls
                  
                document.body.appendChild(link);  
                link.click();  
                document.body.removeChild(link); 
            }

            scope.clearTable = function() {
                LogcatService.clear()
                numberOfEntries = 0
                clearTable()
            }

            scope.$on('$destroy', function() {
                parent.removeEventListener('scroll', throttledScrollListener)
            })
        }
    }
}
