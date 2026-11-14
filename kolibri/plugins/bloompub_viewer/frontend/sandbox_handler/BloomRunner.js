import ZipFile from 'kolibri-zip';
import {
  DOMMapper,
  defaultFilePathMappers,
  getDOMPaths,
  replaceDOMPaths,
} from 'kolibri-zip/src/fileUtils';
import playerManifest from '../../bloom_build/bloom_build.json';

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

const archiveOrigin = 'https://archive.invalid';

function resolveInArchive(src, fileName) {
  const base = new URL(fileName.split('/').map(encodeURIComponent).join('/'), `${archiveOrigin}/`);
  const pathEnd = src.search(/[?#]/);
  const path = pathEnd < 0 ? src : src.slice(0, pathEnd);
  return new URL(path.replace(/%2f/gi, '/') + src.slice(path.length), base);
}

function replaceBloomPaths(fileContents, packageFiles, mimeType, iframeSources) {
  const dom = parse(fileContents, mimeType);
  for (const [index, iframe] of Array.from(dom.querySelectorAll('iframe[src]')).entries()) {
    iframe.setAttribute('src', iframeSources[index]);
  }
  keepOriginalHrefs(dom, packageFiles);
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
    const dom = parse(this.file.toString(), this.file.mimeType);
    for (const iframe of dom.querySelectorAll('iframe[src]')) {
      iframe.removeAttribute('src');
    }
    const paths = getDOMPaths(domSerializer.serializeToString(dom), this.file.mimeType);
    return paths.concat(getAudioFiles(this.file.toString(), this.file.mimeType));
  }

  replacePaths(packageFiles) {
    const dom = parse(this.file.toString(), this.file.mimeType);
    const iframeSources = Array.from(dom.querySelectorAll('iframe[src]'), iframe => {
      const src = iframe.getAttribute('src');
      iframe.setAttribute('src', '');
      return src;
    });
    const newFileContents = replaceDOMPaths(
      domSerializer.serializeToString(dom),
      packageFiles,
      this.file.mimeType,
    );
    return replaceBloomPaths(
      newFileContents,
      packageFiles,
      this.file.mimeType,
      iframeSources.map(src => this.resolveIframeSrc(src)),
    );
  }

  resolveIframeSrc(src) {
    const source = src.trim();
    if (!source) {
      return src;
    }
    try {
      const target = resolveInArchive(source, this.file.name);
      if (target.origin === archiveOrigin) {
        return this.zipcontentUrl + target.pathname + target.search + target.hash;
      }
      return new URL(source, `${this.zipcontentUrl}/`).href;
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
    // A fallback URL to the zipcontent endpoint for this Bloom file
    const storageUrl = new URL(this.filepath, window.location);
    const baseurl = storageUrl.searchParams.get('baseurl');
    const archivePath = `${baseurl ? encodeURIComponent(baseurl) + '/' : ''}${storageUrl.pathname.split('/').pop()}`;
    this.zipcontentUrl = new URL(`../../zipcontent/${archivePath}`, window.location).href;
    const zipcontentUrl = this.zipcontentUrl;
    class BookDOMMapper extends BloomDOMMapper {
      constructor(file) {
        super(file);
        this.zipcontentUrl = zipcontentUrl;
      }
    }
    const filePathMappers = {
      ...defaultFilePathMappers,
      htm: BookDOMMapper,
      html: BookDOMMapper,
      xml: BookDOMMapper,
      xhtml: BookDOMMapper,
    };
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

    this.iframe.src = `../bloom/${playerManifest.filename}?${options.toString()}`;
  }

  /*
   * Get the htm file, distribution file, and meta.json file from the zip.
   */
  processFiles() {
    return Promise.all([
      this.zip.filesFromExtension('.htm', { replacePaths: false }).then(async files => {
        const book = files.find(file => file.name === 'index.htm') || files[0];
        this.contentUrl = (await this.zip.file(book.name)).toUrl();
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
