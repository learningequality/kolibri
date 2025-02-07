module.exports = {
    module: {
        rules: [
            {
                test: /\.ts(x?)$/,
                use: [{ loader: "ts-loader" }],
                exclude: [/sample-/]
            },
            {
                test: /\.js(x?)$/,
                exclude: [/sample-/]
            },
            {
                test: /\.less$/i,
                use: [
                    {
                        loader: "style-loader" // creates style nodes from JS strings
                    },
                    {
                        loader: "css-loader" // translates CSS into CommonJS
                    },
                    {
                        loader: "less-loader" // compiles Less to CSS
                    }
                ]
            }
        ]
    }
};
