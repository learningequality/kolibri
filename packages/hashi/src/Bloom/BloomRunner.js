import ZipFile from 'kolibri-zip';
import { strToU8 } from 'fflate';
import { defaultFilePathMappers } from 'kolibri-zip/src/fileUtils';
import { events } from '../hashiBase';

const CONTENT_ID = '1234567890';

/*
 * Class that manages loading, parsing, and running an Bloom file.
 * Loads the entire Bloom file to the frontend, and then unzips, parses,
 * and turns each file into a Blob and generates a URL for that blob.
 * (this is the same mechanism that EpubJS uses to render Epubs in the frontend).
 * We mirror the path substitution done in the PHP implementation for
 * CSS concatenation, to ensure that all relatively referenced assets
 * in CSS files are instead referenced by their new Blob URLs.
 */
export default class BloomRunner {
  constructor(shim) {
    this.shim = shim;
    this.data = shim.data;
    this.events = events;
    this.scriptLoader = this.scriptLoader.bind(this);
  }

  init(iframe, filepath, loaded, errored) {
    // For each Bloom package, an object that maps the original file
    // reference in the Bloom file to a blob URL reference
    this.packageFiles = {};
    // The iframe that we should be loading Bloom in - this is probably not the
    // same as the current window context that the Bloom constructor has been
    // invoked in.
    this.iframe = iframe;
    // This is the path to the Bloom file which we load in its entirety.
    this.filepath = filepath;
    // A fallback URL to the zipcontent endpoint for this H5P file
    this.zipcontentUrl = new URL(
      `../../zipcontent/${this.filepath.substring(this.filepath.lastIndexOf('/') + 1)}`,
      window.location,
    ).href;
    // Callback to call when Bloom Player has finished loading
    this.loaded = loaded;
    // Callback to call when Bloom errors
    this.errored = errored;
    this.contentNamespace = CONTENT_ID;
    this.zip = new ZipFile(this.filepath);
    return this.processFiles().then(() => {
      this.processContent();
      if (this.iframe.contentDocument && this.iframe.contentDocument.readyState === 'complete') {
        return this.initBloom();
      }

      // Otherwise wait for the load event.
      this.iframe.addEventListener('load', () => this.initBloom());
    });
  }

  /*
   * Start Bloom player in the contentWindow.
   */
  initBloom() {
    return this.scriptLoader('../bloom/storageEvent.js').then(() => {
      try {
        this.loaded();
        this.iframe.contentWindow.postMessage(
          {
            event: this.events.BLOOMDATAREQUESTED,
            data: [this.contentUrl, this.distributionUrl, this.metaUrl],
          },
          '*',
        );
        this.iframe.src = `../bloom/bloomplayer.htm?url=${this.contentUrl}`;
      } catch (e) {
        this.errored(e);
      }
    });
  }

  scriptLoader(url, css = false) {
    const iframeDocument = this.iframe.contentWindow.document;
    return new Promise((resolve, reject) => {
      let script;
      if (!css) {
        script = iframeDocument.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        script.async = true;
        script.addEventListener('load', () => resolve(script));
        script.addEventListener('error', reject);
      } else {
        script = iframeDocument.createElement('link');
        script.rel = 'stylesheet';
        script.type = 'text/css';
        script.href = url;
        // Can't detect loading for css, so just assume it worked.
        resolve(script);
      }
      iframeDocument.body.appendChild(script);
    });
  }

  processContent() {
    const mapper = new defaultFilePathMappers.bloom(this.contentfile);
    const files = mapper.getPaths().filter(file => !file.startsWith('blob:'));
    if (files.length > 0) {
      const replacementFileMap = {};
      for (const file of this.packageFiles) {
        if (files.includes(file.name)) {
          replacementFileMap[file.name] = file.toUrl();
        }
      }
      this.contentfile.obj = strToU8(mapper.replacePaths(replacementFileMap));
      this.contentUrl = this.contentfile.toUrl();
    }
  }

  /*
   * Process all files in the zip, content files and files in the packages
   */
  processFiles() {
    return Promise.all([
      this.zip.files('').then(files => {
        this.packageFiles = files;
      }),
      this.zip.filesFromExtension('.htm').then(htmFile => {
        this.contentfile = htmFile[0];
      }),
      this.zip.filesFromExtension('.distribution').then(distributionFile => {
        this.distributionUrl = distributionFile[0].toUrl();
      }),
      this.zip.filesFromExtension('meta.json').then(meta => {
        this.metaUrl = meta[0].toUrl();
      }),
    ]);
  }
}
