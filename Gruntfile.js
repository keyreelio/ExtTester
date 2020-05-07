const webpackConfig = require('./webpack.config.js');

module.exports = function(grunt) {
    grunt.initConfig({
        ts: {
            default : {
                tsconfig: './tsconfig.json'
            }
        },
        clean: ['./build', './resources/chrome_profiles'],
        run: {
            options: {
            },

            tester_debug: {
                cmd: 'node',
                args: ['./build/tester.js', 'debug']
            },
            tester: {
                cmd: 'node',
                args: ['./build/tester.js']
            },
            tester_continue: {
                cmd: 'node',
                args: ['./build/tester.js', 'continue']
            },

            scanner: {
                args: ['./build/scanner.js']
            },

            report: {
                cmd: 'node',
                args: ['./build/tester.js', 'report', '--console']
            },

            report: {
                cmd: 'node',
                args: ['./build/tester.js', 'report', '--console']
            },

            report_txt: {
                cmd: 'node',
                args: ['./build/tester.js', 'report', '--txt']
            },

            report_csv: {
                cmd: 'node',
                args: ['./build/tester.js', 'report', '--csv']
            },

            thrift: {
                cmd: './node_modules/@creditkarma/thrift-typescript/dist/main/bin/index.js',
                args: [
                    '--target',
                    'thrift-server',
                    '--sourceDir',
                    './src/thrift',
                    '--outDir',
                    './src/thrift/gencode',
                    'structures.thrift',
                    'protocols.thrift'
                ]
            }
        },
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-run');
    // grunt.loadNpmTasks('grunt-webpack');

    grunt.registerTask("default", ["build"]);

    grunt.registerTask("thrift", ["run:thrift"]);
    grunt.registerTask("build", ["thrift", "ts"]);

    grunt.registerTask("tester_debug", ["clean", "build", "run:tester_debug"]);
    grunt.registerTask("tester", ["clean", "build", "run:tester"]);
    grunt.registerTask("tester_continue", ["clean", "build", "run:tester_continue"]);

    grunt.registerTask("report", ["run:report"]);
    grunt.registerTask("report_txt", ["run:report_txt"]);
    grunt.registerTask("report_csv", ["run:report_csv"]);

    grunt.registerTask("scanner", ["clean", "build", "run:scanner"]);
};
