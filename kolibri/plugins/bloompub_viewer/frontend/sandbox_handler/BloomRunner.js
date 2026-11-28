import ZipFile from 'kolibri-zip';
import {
  Mapper,
  defaultFilePathMappers,
  getDocumentPaths,
  replaceDocumentPaths,
  serializeDocument,
} from 'kolibri-zip/src/fileUtils';
import playerManifest from '../../bloom_build/bloom_build.json';

const domParser = new DOMParser();

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

function encodeArchivePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function replaceAudioFiles(dom, packageFiles) {
  for (const { element, attribute, path } of getAudioReferences(dom)) {
    if (packageFiles[path]) {
      element.setAttribute(attribute, packageFiles[path]);
    }
  }
}

function keepOriginalHrefs(dom, packageFiles) {
  const originalPaths = {};
  for (const [path, url] of Object.entries(packageFiles)) {
    originalPaths[url] = path;
  }
  for (const link of dom.querySelectorAll('link[href]')) {
    const originalPath = originalPaths[link.getAttribute('href')];
    if (originalPath) {
      link.setAttribute('data-original-href', originalPath);
    }
  }
}

class BloomDOMMapper extends Mapper {
  constructor(file, zipcontentUrl) {
    super(file);
    this.dom = parse(file.toString(), file.mimeType);
    this.iframeSources = [];
    if (zipcontentUrl) {
      this.zipcontentUrl = zipcontentUrl;
      this.archiveBase = new URL(
        `${window.location.protocol}//archive.invalid/${encodeArchivePath(file.name)}`,
      );
      this.iframeSources = Array.from(this.dom.querySelectorAll('iframe[src]'), iframe => {
        const src = iframe.getAttribute('src');
        iframe.removeAttribute('src');
        return [iframe, src];
      });
    }
  }

  getPaths() {
    const audioPaths = getAudioReferences(this.dom).map(({ path }) => path);
    return getDocumentPaths(this.dom).concat(audioPaths);
  }

  replacePaths(packageFiles) {
    replaceDocumentPaths(this.dom, packageFiles);
    for (const [iframe, src] of this.iframeSources) {
      iframe.setAttribute('src', this.resolveIframeSrc(src));
    }
    const dom = parse(serializeDocument(this.dom), this.file.mimeType);
    keepOriginalHrefs(dom, packageFiles);
    replaceAudioFiles(dom, packageFiles);
    return serializeDocument(dom);
  }

  resolveIframeSrc(src) {
    if (/^[\t\n\f\r ]*$/.test(src)) {
      return src;
    }
    try {
      const base = this.archiveBase;
      const target = new URL(src, base);
      const inheritsArchiveOrigin =
        target.origin === base.origin &&
        new URL(src, `${base.protocol}//relative.invalid/`).origin !== base.origin;
      return inheritsArchiveOrigin
        ? this.zipcontentUrl + target.href.slice(base.origin.length)
        : target.href;
    } catch (error) {
      if (error.name !== 'TypeError') {
        throw error;
      }
      return src;
    }
  }
}

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
    const storageUrl = new URL(this.filepath, window.location);
    const baseurl = storageUrl.searchParams.get('baseurl');
    const archivePath = `${baseurl ? encodeURIComponent(baseurl) + '/' : ''}${storageUrl.pathname.split('/').pop()}`;
    this.zipcontentUrl = new URL(`../../zipcontent/${archivePath}`, window.location).href;
    const zipcontentUrl = this.zipcontentUrl;
    class HtmDOMMapper extends BloomDOMMapper {
      constructor(file) {
        super(file, file.name === bookName ? zipcontentUrl : undefined);
      }
    }
    const filePathMappers = {
      ...defaultFilePathMappers,
      htm: HtmDOMMapper,
      html: BloomDOMMapper,
      xml: BloomDOMMapper,
      xhtml: BloomDOMMapper,
    };
    const largeFileUrlGenerator = filePath => `${this.zipcontentUrl}/${filePath}`;
    this.zip = new ZipFile(this.filepath, { filePathMappers, largeFileUrlGenerator });
    const names = await this.zip.getFileNames();
    const bookName = names.includes('index.htm')
      ? 'index.htm'
      : names.find(name => name.endsWith('.htm'));
    if (!bookName) {
      throw new Error('No .htm book found in the Bloom archive');
    }
    await this.processFiles(bookName);
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

    this.iframe.src = `../bloom/${playerManifest.filename}?${options.toString()}`;
  }

  /*
   * Get the htm file, distribution file, and meta.json file from the zip.
   */
  processFiles(bookName) {
    return Promise.all([
      this.zip.file(bookName).then(book => {
        this.contentUrl = book.toUrl();
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
