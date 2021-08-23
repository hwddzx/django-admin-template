/**
 * grunt-angular-translate
 * https://github.com/firehist/grunt-angular-translate
 *
 * Copyright (c) 2013 "firehist" Benjamin Longearet, contributors
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    var port = 8282,
        host = "0.0.0.0",
        tag = grunt.option('tag') || '0.0.1',
        envs = ['production', 'stage', 'test', 'lab'];

    var templatesModule = 'quail.main';

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        'http-server': {
            'dev': {
                port: port,
                host: host,
                autoIndex: true,
                ext: "html"
            }
        },

        clean: {
            locales: ['src/locales'],
            build: ['build'],
            dist: ['dist']
        },

        copy: {
            build: {
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: ['**'],
                    dest: 'build/'
                }]
            },
            temp: {
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: ['**', '!app/local.js'],
                    dest: 'dist/'
                }]
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: 'build',
                    src: ['index.html', 'bill.html', 'locales/**', 'assets/**', '!assets/main.css', '!assets/vendor.css', 'js/**/*.js', ],
                    dest: 'dist'
                }, {
                    expand: true,
                    cwd: 'build/fonts',
                    src: '*',
                    dest: 'dist/fonts/',
                    flatten: false,
                    filter: 'isFile'
                }]
            },
            extra: {
                files: [
                    {
                        expand: true,
                        cwd: 'vendor/components-font-awesome/fonts/',
                        src: '*',
                        dest: 'build/fonts/',
                        flatten: false,
                        filter: 'isFile'
                    },
                    {
                        expand: true,
                        cwd: 'vendor/bootstrap/fonts/',
                        src: '*',
                        dest: 'build/fonts/',
                        flatten: false,
                        filter: 'isFile'
                    },
                    {
                        expand: true,
                        cwd: 'libs/zTree/zTreeStyle/img',
                        src: '*',
                        dest: 'build/assets/img',
                        flatten: false,
                        filter: 'isFile'
                    }, {
                        expand: true,
                        cwd: 'libs/fancybox2/',
                        src: ['*.gif', '*.png'],
                        dest: 'build/assets/',
                        flatten: false,
                        filter: 'isFile'
                    }
                ]
            }
        },

        wiredep: {
            task: {
                src: ['src/index.html'],
                options: {
                    overrides: {
                        angular: {
                            'main': ['angular.js']
                        },
                        bootstrap: {
                            'main': ['dist/css/bootstrap.css', 'dist/js/bootstrap.js']
                        },
                        'ng-sortable': {
                            'main': ['dist/ng-sortable.js', 'dist/ng-sortable.css']
                        }
                    }
                }
            }
        },

        angularFileLoader: {
            options: {
                scripts: ['src/apps/**/*.js', 'src/components/**/*.js']
            },
            default_options: {
                src: 'src/index.html'
            }
        },
        compass: {
            dev: {
                options: {
                    sassDir: ['src/sass/'],
                    specify: 'src/sass/main.scss',
                    cssDir: ['src/assets/'],
                    environment: 'development'
                }
            }
        },

        i18nextract: {
            default_options: {
                prefix: '',
                suffix: '/translation.json',
                src: ['src/**/*.*'],
                lang: ['en_US', 'ko_KR', 'zh_CN'],
                dest: 'src/locales'
            }
        },

        ngAnnotate: {
            build: {
                files: [{
                    expand: true,
                    cwd: 'build',
                    src: ['**/*.js'],
                    dest: 'build'
                }]
            }
        },

        ngtemplates: {
            app: {
                cwd: 'build/',
                src: ['**/**.html', '!index.html', '!bill.html'],
                dest: 'build/apps/templates.js',
                options: {
                    module: templatesModule
                }
            }
        },

        useref: {
            html: 'build/index.html',
            temp: 'build'
        },

        watch: {
            vendor: {
                files: ['vendor/*'],
                tasks: ['wiredep']
            },
            loader: {
                files: ['src/*'],
                tasks: ['angularFileLoader']
            },
            styles: {
                files: ['src/**/*.scss'],
                tasks: ['compass'],
                options: {
                    nospawn: true
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-http-server');
    grunt.loadNpmTasks('grunt-wiredep');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-ng-annotate');
    grunt.loadNpmTasks("grunt-angular-file-loader");
    grunt.loadNpmTasks('grunt-angular-translate');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-angular-templates');
    grunt.loadNpmTasks('grunt-useref');
    grunt.loadNpmTasks('grunt-replace');
    grunt.loadNpmTasks('grunt-contrib-compass');

    grunt.registerTask('server', ['http-server:dev']);
    grunt.registerTask('reload', ['angularFileLoader']);
    grunt.registerTask('i18n', ['i18nextract']);

    grunt.registerTask("env-replace", "env-replace", function() {
        var releaseEnv = 'test';

        for (var idx = 0; idx < envs.length; idx++) {
            if (tag.indexOf(envs[idx]) > -1) {
                releaseEnv = envs[idx];
            }
        }

        grunt.config.set("replace", {
            dist: {
                options: {
                    prefix: "##",
                    patterns: [{
                        match: 'RELEASE_ENV',
                        replacement: releaseEnv
                    }]
                },
                files: [{
                    src: 'build/apps/app.js',
                    dest: 'build/apps/app.js'
                }]
            },
            html5: {
                options: {
                    prefix: '',
                    patterns: [{
                        match: '<!-- <base href="/home/"> -->',
                        replacement: '<base href="/home/">'
                    }, {
                        match: '//$locationProvider.html5Mode(true)',
                        replacement: '$locationProvider.html5Mode(true)'
                    }]
                },
                files: [{
                    src: 'build/apps/app.js',
                    dest: 'build/apps/app.js'
                }, {
                    src: 'build/index.html',
                    dest: 'build/index.html'
                }]
            },
            lab: {
                options: {
                    patterns: [{
                        match: /<!-- Start of KF5 supportbox script -->[\w\W]*<!-- End of KF5 supportbox script -->/,
                        replacement: '<!-- KF5 supportbox remove -->'
                    }, {
                        match: /<!-- Start of Google Analytics script -->[\w\W]*<!-- End of Google Analytics script -->/,
                        replacement: '<!-- Google Analytics remove -->'
                    }]
                },
                files: [{
                    src: 'build/index.html',
                    dest: 'build/index.html'
                }]
            },
            imageTimeStamp: {
                options: {
                    patterns: [{
                        match: /\?ts=imageTimeStamp/ig,
                        replacement: '?ts=' + new Date().getTime()
                    }]
                },
                files: [{
                    src: 'build/assets/main.css',
                    dest: 'build/assets/main.css'
                }]
            }
        });
        var replaceTasks = ['replace:dist', 'replace:html5', 'replace:imageTimeStamp'];
        if (releaseEnv == "lab") {
            replaceTasks.push('replace:lab');
        }
        grunt.task.run(replaceTasks);

    });

    grunt.registerTask('inject', ['wiredep', 'angularFileLoader']);
    grunt.registerTask('work', ['inject', 'watch:loader', 'watch:styles']);
    grunt.registerTask('debug', ['clean:build', 'copy:build', 'copy:extra', 'env-replace', 'ngAnnotate', 'ngtemplates', 'useref', 'concat', 'cssmin', 'clean:dist', 'copy:dist', 'clean:build']);
    grunt.registerTask('build', ['clean:build', 'copy:build', 'copy:extra', 'env-replace', 'ngAnnotate', 'ngtemplates', 'useref', 'concat', 'uglify', 'cssmin', 'clean:dist', 'copy:dist', 'clean:build']);

    //临时方案
    // grunt.registerTask('build', ['clean:dist', 'copy:temp']);
};
