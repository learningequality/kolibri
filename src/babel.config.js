// WARNING!!!!
// This might be used for unit tests with jest or something, but at the moment
// I *think* what our build is actually using is the webpack.common.js setup of babel-loader.
module.exports = {
    presets: [
        [
            "@babel/preset-react",
            "@babel/preset-env",
            {
                targets: {
                    node: "current"
                }
            }
        ],
        "@babel/preset-typescript",
        "@babel/plugin-syntax-dynamic-import"
    ]
};
