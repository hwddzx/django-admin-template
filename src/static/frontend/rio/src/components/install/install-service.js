Promise.longStackTraces()
angular.module('stf.install-service').factory('InstallService', InstallService)

function InstallService(
    $rootScope, $http, $filter, StorageService, $timeout, RioService
) {
    var installService = Object.create(null)

    var installation = null;
    var installationQueue = [];

    function Installation(control, file) {
        this.control = control;
        this.file = file;
        this.progress = 0
        this.state = "waiting"
        this.settled = false
        this.success = false
        this.error = null
        this.href = null
        this.manifest = null
        this.launch = true
        file.installation = this;
    }

    Installation.prototype = Object.create(EventEmitter.prototype)
    Installation.prototype.constructor = Installation

    Installation.prototype.apply = function($scope) {
        function changeListener() {
            // $scope.safeApply()
            //TODO need reset
            $scope.$apply();
        }

        this.on('change', changeListener)

        $scope.$on('$destroy', function() {
            this.removeListener('change', changeListener)
        }.bind(this))

        return this
    }

    Installation.prototype.update = function(progress, state) {
        this.progress = Math.floor(progress)
        this.state = state
        this.emit('change')
    }

    Installation.prototype.okay = function(state) {
        this.settled = true
        this.progress = 100
        this.success = true
        this.state = state
        this.emit('change');
    }

    Installation.prototype.fail = function(err) {
        this.settled = true
        this.progress = 100
        this.success = false
        this.error = err
        this.state = "error";
        this.emit('change')
    }

    Installation.prototype.destory = function() {
        var file = this.file;
        // $timeout(function() {
        //     file.installation = null;
        // }, 2000);
    }

    function clearInstallation() {
        installation = null;
    }

    function getNextInstallation() {
        return installationQueue.shift()
    }

    installService.install = function(control, file) {
        installationQueue.push(new Installation(control, file));
        if (!installation) {
            installService.installUrl(getNextInstallation());
        }
    }

    installService.installUrl = function(_installation) {
        if (!_installation) {
            return;
        }
        var url = _installation.file.app_file,
            type = _installation.file.type || 'local',
            control = _installation.control;
        installation = _installation;
        $rootScope.$broadcast('install:start', installation)
        installation.update(0, "installing");
        return control.install({
                href: url,
                type: type,
                manifest: {
                    package: "test"
                },
                launch: false,
                packageName: installation.file.package_name,
                version: installation.file.version
            })
            .progressed(function(result) {
                installation.update(result.progress / 2, "installing")
            })
            .then(function() {
                _installation.okay('installed')

                rent_key = RioService.getCurrentRioDevice().rentKey,
                app_name = _installation.file.file_name
                installService.insertRentApp(rent_key,app_name)
            })
            .finally(function() {
                $rootScope.$broadcast('install:end', _installation);
                _installation.destory();
                clearInstallation();
                installService.installUrl(getNextInstallation())
            })
            .catch(function(err) {
                _installation.fail(err.code || err.message)
            })
    }

    installService.insertRentApp = function(rent_key,app_name){
        return $http.post("/api/rio/rent/app/", {rent_key: rent_key,app_name:app_name}).then(function(res) {
            return res.data;
        })
    }

    installService.getApkFiles = function() {
        return $http.get("/api/rio/app/list/").then(function(res) {
            return res.data;
        })
    }

    return installService
}
