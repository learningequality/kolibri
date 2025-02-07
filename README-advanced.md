# Advanced: Notes on embedding bloom-player into other projects

## Getting the pieces

    yarn add bloom-player

This puts the files you need at

    node_modules/bloom-player/dist

Note, however, that you won't typically import or require the bloom-player javascript. That javascript is there to be used by the bloomplayer.htm, which is intended to be the source of an iframe or WebView. So typically you will need to do some step to get the files from node_modules/bloom-player/dist to your output directory.

For example, if gulp is part of your build process, you might use

    gulp.src(paths.nodeFilesNeededInOutput)
        .pipe(gulpCopy(outputDir, { prefix: 1 }));

along with declaring one of your paths to be

    nodeFilesNeededInOutput: [
        "./**/bloom-player/dist/bloomPlayer.min.js",
        "./**/bloom-player/dist/simpleComprehensionQuiz.js",
        "./**/bloom-player/dist/bloomplayer.htm",
        "./**/bloom-player/dist/*.mp3"
    ]

### Other options

You can install npm, run "npm pack bloom-player", and extract the files from the resulting pack.

You could possibly download the files from the URL above, however, there is no easy way to get a list of all the files needed.

## Notes

The url parameter points to the HTML file that is the core of the bloom book. It's supporting files (images etc) must be available at the expected relative addresses.

(Currently we also support the url pointing to the FOLDER that contains the book files. The book itself must have the same name as the folder, with the extension .htm. In the example above, `C%3A/Users/YourName/AppData/Local/Temp/PlaceForStagingBook/myBookTitle` must yield the book's main folder, containing the html file and the other files it references.)

The display of the book will automatically grow to be as large as will fit in the given space. If the book can rotate, it will pick an orientation depending on whether the window is wider then it is tall. If the book has special behaviors, such as motion/animation when in landscape mode, they will be triggered based on the chosen orientation.

`Bloom-player` is designed to be published using `npm` so as to be readily available to a variety of clients. The published version includes both `dest/bloomPlayer.js` and `dest/bloomPlayer.min.js`, as well as an un-minified version of the code and some mp3 files used for responding to comprehension questions. There is also a file simpleComprehensionQuiz.js, but this is needed only for books containing an obsolete kind of comprehension questions.

We deliberately require this component to be used in an `iframe` so that the containing web page is safe from any scripts that might get embedded in Bloom books. For this reason `bloom-player` deliberately manipulates (with `React`) the body of its HTML document.

## CORS permissions

The javascript that makes bloomplayer.htm work needs to load the files from the URL that you pass to it as a param. Unless the URL for bloomplayer.htm has the same 'origin' (basically the part of the URL up to the first slash) as that parameter, browsers will typically consider this a violation of the 'same origin policy' and not allow the book files to be opened.

If you are displaying a book published on Bloom Library, this is not a problem, because we have configured the Bloom Library server to publish the books with the required CORS headers to permit this.

If you are making something entirely independent, you may be able to arrange things so bloomplayer.htm is in fact loaded from the same origin as the book content.

Otherwise, you will have to arrange for the server that is serving the book data to do so with appropriate CORS permissions. Typically there is nothing sensitive in a Bloom book and it is safe to publish it with CORS permissions allowing it to be embedded anywhere.
