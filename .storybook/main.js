module.exports = {
    stories: ["../src/**/stories/*.tsx"],
    addons: [
        "@storybook/addon-knobs",
        "@storybook/addon-essentials",
        "@storybook/addon-links",
        "@storybook/addon-viewport",
        "@storybook/addon-a11y",
        "@storybook/addon-actions",
        "@storybook/addon-interactions"
    ],
    features: {
        interactionsDebugger: true // enable playback controls
    }
};
