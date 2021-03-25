This code is currently pulled verbatim from https://github.com/tunapanda/h5p-standalone/tree/master/dist

To update, copy in the files (with `frame.bundle.js` copied into the JS folder). You can delete any pre-existing files.

To make `frame.bundle.js` compatible with running it inside a sandboxed iframe replace every instance of `window.parent.H5PIntegration` with `window.H5PIntegration`.
