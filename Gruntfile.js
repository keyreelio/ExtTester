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
            tester: {
                cmd: 'node',
                args: [
                    './build/tester.js'
                ]
            },
            thrift: {
                cmd: 'thrift-typescript',
                args: [
                    '--target',
                    'thrift-server',
                    '--sourceDir',
                    './src/thrift',
                    '--outDir',
                    './src/service/gencode',
                    'structures.thrift',
                    'protocols.thrift'
                ]
            }
        },
        webpack: {
            myconfig: () => ({
                entry: path.join(__dirname, "entry"),
                output: {
                    path: __dirname,
                    filename: "output.js",
                },
            }),
        },
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-run');
    grunt.loadNpmTasks('grunt-webpack');

    grunt.registerTask("default", ["build"]);

    grunt.registerTask("thrift", ["run:thrift"]);

    grunt.registerTask("build", ["thrift", "ts"]);
    grunt.registerTask("runner", ["clean", "build", "run:tester"]);
};