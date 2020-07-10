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

            // new
            tester_keyreel: {
                cmd: 'node',
                args: ['./build/tester.js']
            },
            tester_keyreel_continue: {
                cmd: 'node',
                args: ['./build/tester.js', 'continue']
            },
            tester_keyreel_debug: {
                cmd: 'node',
                args: ['./build/tester.js', 'debug']
            },

            tester_domains: {
                cmd: 'node',
                args: ['./build/tester.js', '--domains']
            },
            tester_domains_continue: {
                cmd: 'node',
                args: ['./build/tester.js', 'continue', '--domains']
            },
            tester_domains_debug: {
                cmd: 'node',
                args: ['./build/tester.js', 'debug', '--domains']
            },

            tester_dashlane: {
                cmd: 'node',
                args: ['./build/tester.js', '--engine', 'dashlane']
            },
            tester_dashlane_continue: {
                cmd: 'node',
                args: ['./build/tester.js', 'continue', '--engine', 'dashlane']
            },
            tester_dashlane_debug: {
                cmd: 'node',
                args: ['./build/tester.js', 'debug', '--engine', 'dashlane']
            },


            report: {
                cmd: 'node',
                args: ['./build/tester.js', 'report']
            },

            report_txt: {
                cmd: 'node',
                args: ['./build/tester.js', 'report', '--txt']
            },

            report_csv: {
                cmd: 'node',
                args: ['./build/tester.js', 'report', '--csv']
            },


            scanner: {
                args: ['./build/scanner.js']
            },

            thrift: {
                cmd: 'node',
                args: [
                    './node_modules/@creditkarma/thrift-typescript/dist/main/bin/index.js',
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

    grunt.registerTask("default", ["build"]);

    grunt.registerTask("thrift", ["run:thrift"]);
    grunt.registerTask("build", ["thrift", "ts"]);


    // new
    grunt.registerTask("keyreel", ["clean", "build", "run:tester_keyreel"]);
    grunt.registerTask("keyreel_continue", ["clean", "build", "run:tester_keyreel_continue"]);
    grunt.registerTask("keyreel_debug", ["clean", "build", "run:tester_keyreel_debug"]);

    grunt.registerTask("domains", ["clean", "build", "run:tester_domains"]);
    grunt.registerTask("domains_continue", ["clean", "build", "run:tester_domains_continue"]);
    grunt.registerTask("domains_debug", ["clean", "build", "run:tester_domains_debug"]);


    grunt.registerTask("dashlane", ["clean", "build", "run:tester_dashlane"]);
    grunt.registerTask("dashlane_continue", ["clean", "build", "run:tester_dashlane_continue"]);
    grunt.registerTask("dashlane_debug", ["clean", "build", "run:tester_dashlane_debug"]);

    grunt.registerTask("scanner", ["clean", "build", "run:scanner"]);
};
