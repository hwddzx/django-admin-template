(function() {
    angular.module("distribute")
        .directive("treeTable", treeTable);

    function treeTable($compile, $timeout) {
        return {
            link: function(scope, element) {

                var zTreeObj = null;

                scope.$on("buildTreeTable", function() {

                    if (zTreeObj) {
                        zTreeObj = $.fn.zTree.getZTreeObj(element);
                        zTreeObj.destroy();
                    }

                    $timeout(function() {
                        $.fn.zTree.init(element, scope.vm.setting, scope.vm.nodes);

                        $compile(element.contents())(scope);
                    });

                });
            }
        };
    }

})();