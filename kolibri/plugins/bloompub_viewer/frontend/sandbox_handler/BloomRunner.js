import ZipFile from 'kolibri-zip';
import { DOMMapper, defaultFilePathMappers } from 'kolibri-zip/src/fileUtils';

const domParser = new DOMParser();

const domSerializer = new XMLSerializer();

// Attributes whose value Bloom Player looks up in the book's audio folder.
const audioFileAttributes = [
  'data-backgroundaudio',
  'data-sound',
  'data-correct-sound',
  'data-wrong-sound',
];

function getAudioReferences(dom) {
  const references = [];
  for (const element of dom.querySelectorAll('.audio-sentence')) {
    const fileName = element.getAttribute('data-audio-src') || `${element.id}.mp3`;
    references.push({ element, attribute: 'data-audio-src', path: `audio/${fileName}` });
  }
  for (const attribute of audioFileAttributes) {
    for (const element of dom.querySelectorAll(`[${attribute}]`)) {
      const fileName = element.getAttribute(attribute);
      if (fileName) {
        references.push({ element, attribute, path: `audio/${fileName}` });
      }
    }
  }
  return references;
}

function parse(fileContents, mimeType) {
  return domParser.parseFromString(fileContents.trim(), mimeType);
}

function getAudioFiles(fileContents, mimeType) {
  return getAudioReferences(parse(fileContents, mimeType)).map(({ path }) => path);
}

function replaceAudioFiles(dom, packageFiles) {
  for (const { element, attribute, path } of getAudioReferences(dom)) {
    if (packageFiles[path]) {
      element.setAttribute(attribute, packageFiles[path]);
    }
  }
}

function replaceBloomPaths(fileContents, packageFiles, mimeType) {
  const dom = parse(fileContents, mimeType);
  replaceAudioFiles(dom, packageFiles);
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
    return replaceBloomPaths(newFileContents, packageFiles, this.file.mimeType);
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
  async init(iframe, filepath) {
    // For each Bloom package, an object that maps the original file
    // reference in the Bloom file to a blob URL reference
    this.packageFiles = {};
    // The iframe that we should be loading Bloom in - this is probably not the
    // same as the current window context that the Bloom constructor has been
    // invoked in.
    this.iframe = iframe;
    // This is the path to the Bloompub file which we load in its entirety.
    this.filepath = filepath;
    // A fallback URL to the zipcontent endpoint for this Bloom file
    this.zipcontentUrl = new URL(
      `../../zipcontent/${this.filepath.split('/').pop()}`,
      window.location,
    ).href;
    const largeFileUrlGenerator = filePath => `${this.zipcontentUrl}/${filePath}`;
    this.zip = new ZipFile(this.filepath, { filePathMappers, largeFileUrlGenerator });
    await this.processFiles();
    this.initBloom();
  }

  /*
   * Start Bloom player in the contentWindow.
   */
  initBloom() {
    const params = {
      url: this.contentUrl,
      metaJsonUrl: this.metaUrl,
      independent: false,
      hideFullScreenButton: true,
      initiallyShowAppBar: true,
      allowToggleAppBar: false,
    };
    if (this.distributionUrl) {
      params.distributionUrl = this.distributionUrl;
    }
    if (this.questionsUrl) {
      params.questionsJsonUrl = this.questionsUrl;
    }
    const options = new URLSearchParams(params);

    this.iframe.src = `../bloom/bloomplayer.htm?${options.toString()}`;
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
        this.distributionUrl = distributionFile?.toUrl();
      }),
      this.zip.file('meta.json').then(meta => {
        this.metaUrl = meta.toUrl();
      }),
      this.zip.file('questions.json').then(questions => {
        this.questionsUrl = questions?.toUrl();
      }),
    ]);
  }
}
