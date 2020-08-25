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


            keyreel: { cmd: 'node', args: ['./build/tester.js'] },
            keyreel_continue: { cmd: 'node', args: ['./build/tester.js', 'continue'] },
            keyreel_debug: {cmd: 'node', args: ['./build/tester.js', 'debug', '--tests', '10'] },

            keyreel_domains: { cmd: 'node', args: ['./build/tester.js', '--domains'] },
            keyreel_domains_continue: { cmd: 'node', args: ['./build/tester.js', 'continue', '--domains'] },
            keyreel_domains_debug: { cmd: 'node', args: ['./build/tester.js', 'debug', '--domains', '--tests', '10'] },

            keyreel_fill_domains: { cmd: 'node', args: ['./build/tester.js', '--domains', '--withoutWrite', '--withoutFailWrite'] },
            keyreel_fill_domains_continue: { cmd: 'node', args: ['./build/tester.js', 'continue', '--domains', '--withoutWrite', '--withoutFailWrite'] },
            keyreel_fill_domains_debug: { cmd: 'node', args: ['./build/tester.js', 'debug', '--domains', '--withoutWrite', '--withoutFailWrite', '--tests', '30'] },

            // tester_dashlane: {
            //     cmd: 'node',
            //     args: ['./build/tester.js', '--engine', 'dashlane']
            // },
            // tester_dashlane_continue: {
            //     cmd: 'node',
            //     args: ['./build/tester.js', 'continue', '--engine', 'dashlane']
            // },
            // tester_dashlane_debug: {
            //     cmd: 'node',
            //     args: ['./build/tester.js', 'debug', '--engine', 'dashlane']
            // },


            scanner: { args: ['./build/scanner.js'] },

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
    grunt.registerTask("build", ["clean", "thrift", "ts"]);


    grunt.registerTask("keyreel", ["build", "run:keyreel"]);
    grunt.registerTask("keyreel_continue", ["build", "run:keyreel_continue"]);
    grunt.registerTask("keyreel_debug", ["build", "run:keyreel_debug"]);

    grunt.registerTask("keyreel_domains", ["build", "run:keyreel_domains"]);
    grunt.registerTask("keyreel_domains_continue", ["build", "run:keyreel_domains_continue"]);
    grunt.registerTask("keyreel_domains_debug", ["build", "run:keyreel_domains_debug"]);

    grunt.registerTask("keyreel_fill_domains", ["build", "run:keyreel_fill_domains"]);
    grunt.registerTask("keyreel_fill_domains_continue", ["build", "run:keyreel_fill_domains_continue"]);
    grunt.registerTask("keyreel_fill_domains_debug", ["build", "run:keyreel_fill_domains_debug"]);


    // grunt.registerTask("dashlane", ["build", "run:tester_dashlane"]);
    // grunt.registerTask("dashlane_continue", ["build", "run:tester_dashlane_continue"]);
    // grunt.registerTask("dashlane_debug", ["build", "run:tester_dashlane_debug"]);

    grunt.registerTask("scanner", ["build", "run:scanner"]);
};
