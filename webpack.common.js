var path = require("path");
var node_modules = path.resolve(__dirname, "node_modules");
const core = require("./webpack.core.js");
const merge = require("webpack-merge");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WebpackBeforeBuildPlugin = require("before-build-webpack");
const fs = require("fs");
const glob = require("glob");
const {
    Translations,
    TranslationStatus
} = require("@crowdin/crowdin-api-client");
const { default: Axios } = require("axios");
const { EOL } = require("os"); // system specific End Of Line string

var outputDir = "dist";

const kCrowdinApiToken = process.env.bloomCrowdinApiToken;
const kCrowdinProjectId = 261564;
const kCrowdinBloomPlayerFileId = 120; // Only one file.  This keeps things simple.
let l10nsMergedAlready = false; // used to prevent "watch-run" from always finding new file to compile.

// From Bloom's webpack, it seems this is needed
// if ever our output directory does not have the same parent as our node_modules. We then
// need to resolve the babel related presets (and plugins).  This mapping function was
// suggested at https://github.com/babel/babel-loader/issues/166.
// Since our node_modules DOES have the same parent, maybe we could do without it?
function localResolve(preset) {
    return Array.isArray(preset)
        ? [require.resolve(preset[0]), preset[1]]
        : require.resolve(preset);
}
module.exports = merge(core, {
    // mode must be set to either "production" or "development" in webpack 4.
    // Webpack-common is intended to be 'required' by something that provides that.
    context: __dirname,
    entry: {
        bloomPlayer: "./src/bloom-player-root.ts"
    },

    output: {
        path: path.join(__dirname, outputDir),
        filename: "[name].js",

        libraryTarget: "window",

        //makes the exports of bloom-player-root.ts accessible via window.BloomPlayer.X,
        // e.g., window.BloomPlayer.BloomPlayerCore.
        library: "BloomPlayer"
    },

    resolve: {
        // For some reason, webpack began to complain about being given minified source.
        // alias: {
        //   "react-dom": pathToReactDom,
        //   react: pathToReact // the point of this is to use the minified version. https://christianalfoni.github.io/react-webpack-cookbook/Optimizing-rebundling.html
        // },
        modules: [".", node_modules],
        extensions: [".js", ".jsx", ".ts", ".tsx"] //We may need to add .less here... otherwise maybe it will ignore them unless they are require()'d
    },

    plugins: [
        // Combine the messages.json files for the various languages into a single
        // json file imported by compiling the code.
        new WebpackBeforeBuildPlugin(function(stats, callback) {
            // If the system is set up for it, download the current translated messages files.
            if (kCrowdinApiToken && !l10nsMergedAlready) {
                fetchUpdatedCrowdinTranslations().then(results => {
                    results.forEach(res => {
                        SaveCrowdinTranslationFile(res.config.url, res.data);
                    });
                    CombineTranslatedMessagesFiles();
                    callback(); // don't call it if you do want to stop compilation
                });
            } else {
                // Go with whatever translations we've got already.
                CombineTranslatedMessagesFiles();
                callback(); // don't call it if you do want to stop compilation
            }
        }),
        // Inserts the script tag for the main JS bundle (in production builds, with a hash
        // in the name) into the template bloomplayer.htm, while copying it to the output.
        new HtmlWebpackPlugin({
            title: "Bloom Player",
            filename: "bloomplayer.htm",
            template: "src/bloomplayer.htm"
        }),
        // Note: CopyPlugin says to use forward slashes.
        // Note: the empty "to" options mean to just go to the output folder, which is "dist/"
        // We're not actually using this any more...keeping in case we resurrect
        // simpleComprehensionQuiz.js.
        new CopyPlugin([
            // These are more-or-less obsolete. If they're needed at all it's for json
            // comprehension questions from pre-4.6 Bloom. If we decide to reinstate this
            // using the same mechanism, we have to uncomment the content of simpleComprehensionQuiz.js
            // and figure out what to do about hashing names.
            // {
            //     from:
            //         "src/activities/legacyQuizHandling/simpleComprehensionQuiz.js",
            //     to: "",
            //     flatten: true
            // },
            // {
            //     from: "src/activities/legacyQuizHandling/Special.css",
            //     to: "",
            //     flatten: true
            // },
        ])
    ],

    optimization: {
        minimize: false,
        namedModules: true,
        splitChunks: {
            cacheGroups: {
                default: false
            }
        }
    },
    module: {
        rules: [
            // Note: typescript handling is imported from webpack.core.js
            {
                // For the most part, we're using typescript and ts-loader handles that.
                // But for things that are still in javascript, the following babel setup allows newer
                // javascript features by compiling to the version JS feature supported by the specific
                // version of FF we currently ship with.
                test: /\.(js|jsx)$/,
                exclude: [
                    // We need babel to transpile parts of swiper (swiper and dom7) because they require JS that GeckofX 45 doesn't support.
                    // We can remove this exception when we are fully in gfx60.
                    // See https://github.com/kidjp85/react-id-swiper/issues/332
                    /node_modules\/(?!(swiper|dom7)\/).*/,
                    /ckeditor/,
                    /jquery-ui/,
                    /-min/,
                    /qtip/,
                    /xregexp-all-min.js/
                ],
                use: [
                    {
                        loader: "babel-loader",
                        query: {
                            presets: [
                                // Target Bloom Desktop's current version of geckofx
                                [
                                    "@babel/preset-env",
                                    {
                                        targets: {
                                            browsers: [
                                                "last 3 ChromeAndroid versions", // this is kind of bogus, it ignores the number
                                                "Firefox >= 45", // what Bloom Desktop 4.7 needs
                                                ">1%" //don't support if the browser is <= 1% use
                                            ]
                                        }
                                    }
                                ]
                                //"babel-preset-react" this leads to an error if we export from raw .js, and we aren't doing react with js
                            ].map(localResolve)
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                loader: "style-loader!css-loader"
            },
            // WOFF Font--needed?
            {
                test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
                use: {
                    loader: "url-loader",
                    options: {
                        limit: 10000,
                        mimetype: "application/font-woff"
                    }
                }
            },
            {
                // this allows things like background-image: url("myComponentsButton.svg") and have the resulting path look for the svg in the stylesheet's folder
                // the last few seem to be needed for (at least) slick-carousel to build. We're no longer using that, so maybe we could shorten it...
                // it also allows us to import mp3s files and get them copied to output with a hashed name
                // that we can safely put a long cache control time on, because a later version of the player will use a different hash.
                test: /\.(svg|jpg|png|ttf|eot|gif|mp3)$/,
                use: {
                    loader: "file-loader",
                    options: {
                        name: "[name]-[contenthash].[ext]"
                    }
                }
            }
        ]
    }
});

// Write the given messages file to the proper folder for the language given
// in the url.
function SaveCrowdinTranslationFile(url, messagesJson) {
    // A bit of a hack to get the language tag, but I couldn't think of a better way to get it.
    const urlRegex = /^http.*\/exported_files\/([^\/]+)\/.*$/;
    const matchUrl = urlRegex.exec(url);
    let lang = matchUrl[1];
    // handle es-ES, pt-PT, ne-NP and others like them.  (zh-CN is an exception to the rule.)
    const tagRegex = /^([a-z]+)-[A-Z][A-Z]$/;
    const matchTag = tagRegex.exec(lang);
    if (matchTag && matchTag[1] !== "zh") lang = matchTag[1];

    const folder = `src/l10n/_locales/${lang}`;
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, true);
    const path = `${folder}/messages.json`;
    console.log("Saving translated messages to " + path);
    fs.writeFileSync(path, JSON.stringify(messagesJson, null, 2)); // prettified stringification
}

// Export the translated messages file for the given language, and retrieve
// the exported file content.
async function fetchCrowdinData(translationsApi, lang) {
    const fetchUrl = await translationsApi.exportProjectTranslation(
        kCrowdinProjectId,
        {
            targetLanguageId: lang,
            fileIds: [kCrowdinBloomPlayerFileId],
            skipUntranslatedStrings: true,
            exportApprovedOnly: true
        }
    );
    return Axios.get(fetchUrl.data.url);
}

// Get the data for current, up to date translated messages files for all the languages
// that have translations for any of the strings.
async function fetchUpdatedCrowdinTranslations() {
    // Get the list of languages that have translations available for our
    // messages file.
    let languages = [];
    // An error here should stop the compilation process.
    try {
        const translationStatusApi = new TranslationStatus({
            token: kCrowdinApiToken
        });
        const status = await translationStatusApi.getFileProgress(
            kCrowdinProjectId,
            kCrowdinBloomPlayerFileId,
            500
        );
        status.data.forEach(language => {
            if (language.data.approvalProgress > 0) {
                languages.push(language.data.languageId);
            }
        });

        const translationsApi = new Translations({
            token: kCrowdinApiToken
        });

        // The Crowdin API allows a maximum of 20 simultaneous queries from any one account.
        // We do 10 at a time to keep safely under that limit.  (and we have 11 translations
        // already to start with, so this code could get exercised.)
        const results = [];
        while (languages.length > 0) {
            const langs = [];
            const limit = Math.min(10, languages.length);
            for (let i = 0; i < limit; ++i) {
                langs.push(languages.pop());
            }
            const partial = langs.map(lang => {
                return fetchCrowdinData(translationsApi, lang);
            });
            const partialResults = await Promise.all(partial);

            while (partialResults.length) {
                results.push(partialResults.pop());
            }
        }
        return results; // returns array of Axios response promises
    } catch (err) {
        console.log("Error in fetchUpdatedCrowdinTranslations: " + err);
        throw err;
    }
}

// Read all of the message files from the _locales folder and combine them
// to form the full messages file organized by language tag.
function CombineTranslatedMessagesFiles() {
    if (l10nsMergedAlready) return;
    l10nsMergedAlready = true;
    const regex = /src\/l10n\/_locales\/(.*)\/messages.json/;
    glob("src/l10n/_locales/*/messages.json", (error, files) => {
        let output = "";
        let langs = [];
        files.forEach(filename => {
            const match = regex.exec(filename);
            const lang = match[1];
            langs.push(lang);
            const contents = ` "${lang}": ${fs.readFileSync(filename, "utf8")}`;
            output =
                output + (output.length ? "," + EOL : "") + contents.trimEnd();
        });
        fs.writeFileSync("src/l10n/l10n-all.json", `{ ${output} }`);
        console.log(`Combined localizations for ${langs.join(", ")}`);
    });
}
