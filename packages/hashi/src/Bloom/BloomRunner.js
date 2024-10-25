import ZipFile from 'kolibri-zip';
import { DOMMapper, defaultFilePathMappers } from 'kolibri-zip/src/fileUtils';
import { events } from '../hashiBase';

const domParser = new DOMParser();

const domSerializer = new XMLSerializer();

const audioClassAttributeSelector = '[class*="audio-sentence"], [data-backgroundaudio]';

function getAudioFiles(fileContents, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const elements = dom.querySelectorAll(audioClassAttributeSelector);
  return Array.from(elements).map(element => {
    const value = element.getAttribute('data-backgroundaudio')
      ? element.getAttribute('data-backgroundaudio')
      : element.getAttribute('id');
    // By convention all audio files are in a folder called "audio"
    // and have a .mp3 extension.
    return `audio/${value}.mp3`;
  });
}

function replaceAudioFiles(fileContents, packageFiles, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const elements = Array.from(dom.querySelectorAll(audioClassAttributeSelector));
  for (const element of elements) {
    const attributeName = element.getAttribute('data-backgroundaudio')
      ? 'data-backgroundaudio'
      : 'id';
    const id = element.getAttribute(attributeName);
    const url = packageFiles[`audio/${id}`]
      ? packageFiles[`audio/${id}`]
      : packageFiles[`audio/${id}.mp3`];
    // We cannot set the fully qualified URL as the attribute here, as it breaks subsequent
    // attempts to use the id as a DOM selector by Bloom player.
    // The URL is rehydrated inside Bloom player, thanks to our code modifications there.
    element.setAttribute(attributeName, `_${url.split('/').at(-1)}`);
  }
  if (mimeType === 'text/html') {
    // Remove the namespace attribute from the root element
    // as serializeToString adds it by default and without this
    // it gets repeated.
    dom.documentElement.removeAttribute('xmlns');
  }
  return domSerializer.serializeToString(dom);
}

class BloomDOMMapper extends DOMMapper {
  getPaths() {
    const paths = super.getPaths();
    return paths.concat(getAudioFiles(this.file.toString(), this.file.mimeType));
  }

  replacePaths(packageFiles) {
    const newFileContents = super.replacePaths(packageFiles);
    return replaceAudioFiles(newFileContents, packageFiles, this.file.mimeType);
  }
}

// Override the default file path mappers to include our custom BloomDOMMapper
// which handles the special audio file references.
const filePathMappers = {
  ...defaultFilePathMappers,
  htm: BloomDOMMapper,
  html: BloomDOMMapper,
  xml: BloomDOMMapper,
  xhtml: BloomDOMMapper,
};

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
  }

  init(iframe, filepath, loaded, errored) {
    // For each Bloom package, an object that maps the original file
    // reference in the Bloom file to a blob URL reference
    this.packageFiles = {};
    // The iframe that we should be loading Bloom in - this is probably not the
    // same as the current window context that the Bloom constructor has been
    // invoked in.
    this.iframe = iframe;
    // This is the path to the Bloompub file which we load in its entirety.
    this.filepath = filepath;
    // Callback to call when Bloom Player has finished loading
    this.loaded = loaded;
    // Callback to call when Bloom errors
    this.errored = errored;
    this.zip = new ZipFile(this.filepath, { filePathMappers });
    return this.processFiles().then(() => {
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
    try {
      this.loaded();
      const options = new URLSearchParams({
        url: this.contentUrl,
        distributionUrl: this.distributionUrl,
        metaJsonUrl: this.metaUrl,
        independent: false,
        hideFullScreenButton: true,
        initiallyShowAppBar: false,
        allowToggleAppBar: false,
      });

      this.iframe.src = `../bloom/bloomplayer.htm?${options.toString()}`;
    } catch (e) {
      this.errored(e);
    }
  }

  /*
   * Get the htm file, distribution file, and meta.json file from the zip.
   */
  processFiles() {
    return Promise.all([
      // The htm file does not have a predictable name, so we find
      // the first one in the zip.
      this.zip.filesFromExtension('.htm').then(htmFile => {
        this.contentUrl = htmFile[0].toUrl();
      }),
      this.zip.file('.distribution').then(distributionFile => {
        this.distributionUrl = distributionFile.toUrl();
      }),
      this.zip.file('meta.json').then(meta => {
        this.metaUrl = meta.toUrl();
      }),
    ]);
  }
}
