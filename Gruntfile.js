module.exports = function(grunt) {
    grunt.initConfig({
        ts: {
            default : {
                tsconfig: './tsconfig.json'
            }
        },
        clean: ['./build']
    });
    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.registerTask("default", ["clean", "ts"]);
};