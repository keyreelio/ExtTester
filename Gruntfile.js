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

            build_stop_page_ext: {
                cmd: './node_modules/.bin/web-ext',
                args: ['build', "--ignore-files='*~'", '--source-dir=./src/extensions/stop-load-ext', '--artifacts-dir=./resources/crxs', '--overwrite-dest']
            },

            keyreel: { cmd: 'node', args: ['./build/tester.js'] },
            keyreel_continue: { cmd: 'node', args: ['./build/tester.js', 'continue'] },
            keyreel_debug: {cmd: 'node', args: ['./build/tester.js', 'debug', '--tests', '10'] },

            keyreel_domains: { cmd: 'node', args: ['./build/tester.js', '--domains'] },
            keyreel_domains_continue: { cmd: 'node', args: ['./build/tester.js', 'continue', '--domains'] },
            keyreel_domains_debug: { cmd: 'node', args: ['./build/tester.js', 'debug', '--domains', '--tests', '10'] },

            keyreel_fill_domains: { cmd: 'node', args: ['./build/tester.js', '--domains', '--withoutSave', '--withoutFailSave', '--tests', '500'] },
            keyreel_fill_domains_continue: { cmd: 'node', args: ['./build/tester.js', 'continue', '--domains', '--withoutSave', '--withoutFailSave', '--tests', '500'] },
            keyreel_fill_domains_vpn_continue: { cmd: 'node', args: ['./build/tester.js', 'continue', '--domains', '--withoutSave', '--withoutFailSave', '--vpn', '--tests', '500'] },
            keyreel_fill_domains_debug: { cmd: 'node', args: ['./build/tester.js', 'debug', '--domains', '--withoutSave', '--withoutFailSave'] },

            dashlane: { cmd: 'node', args: ['./build/tester.js', '--engine', 'dashlane'] },
            dashlane_continue: { cmd: 'node', args: ['./build/tester.js', 'continue', '--engine', 'dashlane'] },
            dashlane_debug: { cmd: 'node', args: ['./build/tester.js', 'debug', '--engine', 'dashlane'] },

            dashlane_domains: { cmd: 'node', args: ['./build/tester.js', '--engine', 'dashlane', '--domains'] },
            dashlane_domains_continue: { cmd: 'node', args: ['./build/tester.js', 'continue', '--engine', 'dashlane', '--domains'] },
            dashlane_domains_debug: { cmd: 'node', args: ['./build/tester.js', 'debug', '--engine', 'dashlane', '--domains'] },

            dashlane_fill_domains: { cmd: 'node', args: ['./build/tester.js', '--engine', 'dashlane', '--domains', '--withoutSave', '--withoutFailSave'] },
            dashlane_fill_domains_continue: { cmd: 'node', args: ['./build/tester.js', 'continue', '--engine', 'dashlane', '--domains', '--withoutSave', '--withoutFailSave', '--tests', '500'] },
            dashlane_fill_domains_debug: { cmd: 'node', args: ['./build/tester.js', 'debug', '--engine', 'dashlane', '--domains', '--withoutSave', '--withoutFailSave'] },

            report: { cmd: 'node', args: ['./build/tester.js', 'report'] },
            report_txt: { cmd: 'node', args: ['./build/tester.js', 'report', '--txt'] },
            report_csv: { cmd: 'node', args: ['./build/tester.js', 'report', '--csv'] },

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
    grunt.registerTask("build_stop_page_ext", ["run:build_stop_page_ext"]);

    grunt.registerTask("build", ["clean", "build_stop_page_ext", "thrift", "ts"]);


    grunt.registerTask("keyreel", ["build", "run:keyreel"]);
    grunt.registerTask("keyreel_continue", ["build", "run:keyreel_continue"]);
    grunt.registerTask("keyreel_debug", ["build", "run:keyreel_debug"]);

    grunt.registerTask("keyreel_domains", ["build", "run:keyreel_domains"]);
    grunt.registerTask("keyreel_domains_continue", ["build", "run:keyreel_domains_continue"]);
    grunt.registerTask("keyreel_domains_debug", ["build", "run:keyreel_domains_debug"]);

    grunt.registerTask("keyreel_fill_domains", ["build", "run:keyreel_fill_domains"]);
    grunt.registerTask("keyreel_fill_domains_continue", ["build", "run:keyreel_fill_domains_continue"]);
    grunt.registerTask("keyreel_fill_domains_vpn_continue", ["build", "run:keyreel_fill_domains_vpn_continue"]);
    grunt.registerTask("keyreel_fill_domains_debug", ["build", "run:keyreel_fill_domains_debug"]);

    grunt.registerTask("dashlane", ["build", "run:dashlane"]);
    grunt.registerTask("dashlane_continue", ["build", "run:dashlane_continue"]);
    grunt.registerTask("dashlane_debug", ["build", "run:dashlane_debug"]);

    grunt.registerTask("dashlane_domains", ["build", "run:dashlane_domains"]);
    grunt.registerTask("dashlane_domains_continue", ["build", "run:dashlane_domains_continue"]);
    grunt.registerTask("dashlane_domains_debug", ["build", "run:dashlane_domains_debug"]);

    grunt.registerTask("dashlane_fill_domains", ["build", "run:dashlane_fill_domains"]);
    grunt.registerTask("dashlane_fill_domains_continue", ["build", "run:dashlane_fill_domains_continue"]);
    grunt.registerTask("dashlane_fill_domains_debug", ["build", "run:dashlane_fill_domains_debug"]);

    grunt.registerTask("scanner", ["build", "run:scanner"]);
};
