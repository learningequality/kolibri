import ZipFile from 'kolibri-zip';
import { DOMMapper, defaultFilePathMappers } from 'kolibri-zip/src/fileUtils';
import { events } from '../hashiBase';

const domParser = new DOMParser();

const domSerializer = new XMLSerializer();

const audioSentenceSelector = '.audio-sentence';

const backgroundAudioSelector = '[data-backgroundaudio]';

function getAudioFiles(fileContents, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const audioSentenceElements = dom.querySelectorAll(audioSentenceSelector);
  const audioSentencePaths = Array.from(audioSentenceElements).map(element => {
    const value = element.getAttribute('id');
    // By convention all audio files are in a folder called "audio"
    // and have a .mp3 extension.
    return `audio/${value}.mp3`;
  });
  const backgroundAudioElements = dom.querySelectorAll(backgroundAudioSelector);
  const backgroundAudioPaths = Array.from(backgroundAudioElements).map(element => {
    const value = element.getAttribute('data-backgroundaudio');
    // These files already have their extension, so we don't need to add it.
    return `audio/${value}`;
  });
  return audioSentencePaths.concat(backgroundAudioPaths);
}

function _setDehydratedUrlAttribute(element, attributeName, url) {
  // We have seen cases where the audio file simply isn't in the archive, so we need to check
  // if the URL is null before setting it.
  if (!url) {
    return;
  }
  // We cannot set the fully qualified URL as the attribute here, as it breaks subsequent
  // attempts to use the id as a DOM selector by Bloom player.
  // The URL is rehydrated inside Bloom player, thanks to our code modifications there.
  element.setAttribute(attributeName, `_${url.split('/').at(-1)}`);
}

function replaceAudioFiles(fileContents, packageFiles, mimeType) {
  const dom = domParser.parseFromString(fileContents.trim(), mimeType);
  const audioSentenceElements = dom.querySelectorAll(audioSentenceSelector);
  for (const element of audioSentenceElements) {
    const id = element.getAttribute('id');
    const url = packageFiles[`audio/${id}.mp3`];
    _setDehydratedUrlAttribute(element, 'id', url);
  }
  const backgroundAudioElements = dom.querySelectorAll(backgroundAudioSelector);
  for (const element of backgroundAudioElements) {
    const id = element.getAttribute('data-backgroundaudio');
    const url = packageFiles[`audio/${id}`];
    _setDehydratedUrlAttribute(element, 'data-backgroundaudio', url);
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
        initiallyShowAppBar: true,
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
