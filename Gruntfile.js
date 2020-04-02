const webpackConfig = require('./webpack.config.js');

module.exports = function(grunt) {
    grunt.initConfig({
        ts: {
            default : {
                tsconfig: './tsconfig.json'
            }
        },
        clean: ['./build'],
        run: {
            options: {
            },
            tester: {
                cmd: 'node',
                args: [
                    './build/tester.js'
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

    grunt.registerTask("build", ["ts"]);
    grunt.registerTask("runner", ["build", "run:tester"]);
};