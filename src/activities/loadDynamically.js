import dynamicImportPolyfill from "dynamic-import-polyfill";

// This needs to be done before any dynamic imports are used.
dynamicImportPolyfill.initialize({
    importFunctionName: "polyfill_import" // Defaults to '__import__'
});

export function loadDynamically(src) {
    // NB: src has to start with a slash https://stackoverflow.com/a/46739184/723299
    if (src.indexOf("/") !== 0) {
        src = "/" + src;
    }
    // eslint-disable-next-line no-undef
    return polyfill_import(src);
}
