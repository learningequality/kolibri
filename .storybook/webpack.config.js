// Here we take storybook's webpack, which currently doesn't know about typescript or less,
// and add the needed rules from our webpack.core.js. See https://storybook.js.org/docs/configurations/typescript-config/

const core = require("../webpack.core.js");
module.exports = ({ config }) => {
    config.module.rules.push(...core.module.rules);
    config.resolve.extensions.push(".ts", ".tsx");
    // hide the noisy webpack.progress lines. See https://github.com/storybookjs/storybook/issues/1872
    config.plugins = config.plugins.filter(
        ({ constructor }) => constructor.name !== "ProgressPlugin"
    );
    return config;
};
