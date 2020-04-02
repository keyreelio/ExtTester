module.exports = {
    entry: "./src/tester.ts",
    output: {
        path: './build',
        filename: "bundle.js"
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".json"]
    },
    module: {
        rules: [
            // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
            {test: /\.tsx?$/, use: ["ts-loader"], exclude: /node_modules/}
        ]
    }
};
