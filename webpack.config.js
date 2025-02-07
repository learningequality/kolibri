const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = merge(common, {
    mode: "development",
    devtool: "source-map",
    devServer: {
        static: { directory: "./dist" },
        client: {
            overlay: { errors: true, warnings: false }
        },
        devMiddleware: {
            index: "../index.html",
            writeToDisk: true
        }
    },
    plugins: [
        // Note: CopyPlugin says to use forward slashes.        // Note: the empty "to" options mean to just go to the output folder, which is "dist/"
        new CopyPlugin([
            {
                from: "index-for-developing.html",
                to: "index.html",
                flatten: true
            },

            // the normal bloomplayer.html looks for the minified bloomplayer, this one doesn't
            {
                from: "src/bloomplayer-for-developing.htm",
                to: "",
                flatten: true
            }
        ])
    ]
});
