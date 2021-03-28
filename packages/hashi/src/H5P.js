import JSZip from 'jszip';
import get from 'lodash/get';
import isFunction from 'lodash/isFunction';
import set from 'lodash/set';
import unset from 'lodash/unset';
import Toposort from 'toposort-class';
import BaseShim from './baseShim';
import loadBinary from './loadBinary';
import mimetypes from './mimetypes.json';

function escapeRegExp(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function contentIdentifier(contentId) {
  return `cid-${contentId}`;
}

/*
 * Create a blob and URL for a uint8array
 * set the mimetype and return the URL
 */
function createBlobUrl(uint8array, fileName) {
  let type = '';
  const fileNameExt = fileName.split('.').slice(-1)[0];
  if (fileNameExt) {
    const ext = fileNameExt.toLowerCase();
    type = mimetypes[ext];
  }
  const blob = new Blob([uint8array.buffer], { type });
  return URL.createObjectURL(blob);
}

export default class H5P extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.data = {};
    this.userData = {};
    this.nameSpace = 'H5P';
    this.__setData = this.__setData.bind(this);
    this.__setUserData = this.__setUserData.bind(this);
    this.on(this.events.STATEUPDATE, this.__setData);
    this.on(this.events.USERDATAUPDATE, this.__setUserData);
  }

  init(iframe, filepath, contentNamespace) {
    this.dependencies = [];
    this.jsDependencies = {};
    this.cssDependencies = {};
    this.packageFiles = {};
    this.contentPaths = {};
    this.contentJson = '';
    this.library = null;
    this.scriptLoader = this.scriptLoader.bind(this);
    this.loadedJs = {};
    this.loadedCss = {};
    this.iframe = iframe;
    this.iframe.src = '../h5p/';
    this.filepath = filepath;
    this.contentNamespace = contentNamespace;
    this.rootConfig;
    loadBinary(this.filepath)
      .then(JSZip.loadAsync)
      .then(zip => {
        this.zip = zip;
        return this.recurseDependencies('h5p.json', true);
      })
      .then(() => {
        this.setDependencies();
        return this.processFiles().then(() => {
          this.processJsDependencies();
          this.processCssDependencies();
          if (
            this.iframe.contentDocument &&
            this.iframe.contentDocument.readyState === 'complete'
          ) {
            return this.initH5P();
          }
          this.iframe.addEventListener('load', () => this.initH5P());
        });
      });
  }

  __setData(data = {}) {
    this.data = data;
  }

  __setUserData(userData = {}) {
    this.userData = userData;
  }

  loadDependencies(dependencies, css = false) {
    return dependencies.reduce((p, depMap) => {
      return p.then(() => {
        return Promise.all(
          Object.values(depMap.fileMap).map(url => {
            return this.scriptLoader(url, css);
          })
        );
      });
    }, Promise.resolve());
  }

  initH5P() {
    this.shimH5P(this.iframe.contentWindow);
    return this.loadDependencies(this.cssDependencies, true).then(() => {
      return this.loadDependencies(this.jsDependencies).then(() => {
        this.iframe.contentWindow.H5P.init();
      });
    });
  }

  shimH5P(contentWindow) {
    const div = contentWindow.document.createElement('div');
    div.classList.add('h5p-content');
    div.setAttribute('data-content-id', this.contentNamespace);
    contentWindow.document.body.appendChild(div);
    const H5P = contentWindow.H5P;
    const originalGetPath = H5P.getPath;
    const self = this;
    H5P.getPath = function(path, contentId) {
      if (self.contentPaths[path]) {
        return self.contentPaths[path];
      }
      return originalGetPath(path, contentId);
    };
    H5P.getUserData = function(contentId, dataId, done, subContentId = 0) {
      const data = get(self.data, [subContentId, dataId]);
      if (data === 'RESET') {
        return done(undefined, null);
      }
      return done(undefined, data);
    };
    H5P.setUserData = function(
      contentId,
      dataId,
      data,
      { subContentId = 0, errorCallback = null } = {}
    ) {
      try {
        data = JSON.stringify(data);
      } catch (err) {
        if (isFunction(errorCallback)) {
          errorCallback(err);
        }
        return; // Failed to serialize.
      }
      set(self.data, [subContentId, dataId], data);
      self.stateUpdated();
    };
    H5P.deleteUserData = function(contentId, dataId, subContentId = 0) {
      unset(self.data, [subContentId, dataId]);
      self.stateUpdated();
    };
    const originalContentType = H5P.ContentType;
    H5P.ContentType = function(isRoot) {
      const ct = originalContentType(isRoot);
      ct.prototype.getLibraryFilePath = function(filePath) {
        return filePath;
      };
      return ct;
    };
    H5P.XAPIEvent.prototype.setActor = function() {
      this.data.statement.actor = {
        name: self.userData.userFullName,
        objectType: 'Agent',
        mbox_sha1sum: self.userData.userId,
      };
    };
  }

  iframeInitialize(contentWindow) {
    const self = this;
    this.integrationShim = {
      get contents() {
        return {
          [contentIdentifier(self.contentNamespace)]: {
            library: self.library,
            jsonContent: self.contentJson,
            fullScreen: false,
            displayOptions: {
              copyright: false,
              download: false,
              embed: false,
              export: false,
              frame: false,
              icon: false,
            },
            contentUserData: self.data,
            exportUrl: '',
            embedCode: '',
            resizeCode: '',
            mainId: self.contentNamespace,
            url: self.rootConfig.source || self.contentNamespace,
            title: self.rootConfig.title,
            styles: Object.keys(self.loadedCss),
            scripts: Object.keys(self.loadedJs),
          },
        };
      },
      l10n: {
        H5P: {},
      },
      get loadedJs() {
        return Object.keys(self.loadedJs);
      },
      get loadedCss() {
        return Object.keys(self.loadedCss);
      },
      get user() {
        return {
          name: self.userData.userFullName,
          mail: '',
        };
      },
    };
    Object.defineProperty(contentWindow, 'H5PIntegration', {
      value: this.integrationShim,
      configurable: true,
    });
  }

  /**
   * Loads a Javascript file and executes it.
   * @param  {String} url URL for the script
   * @return {Promise}     Promise that resolves when the script has loaded
   */
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

  setDependencies() {
    const dependencySorter = new Toposort();

    for (let i = 0; i < this.dependencies.length; i++) {
      const dependency = this.dependencies[i];
      this.packageFiles[dependency.packagePath] = {};
      dependencySorter.add(dependency.packagePath, dependency.dependencies);

      this.cssDependencies[dependency.packagePath] = dependency.preloadedCss;

      this.jsDependencies[dependency.packagePath] = dependency.preloadedJs;
    }

    this.sortedDependencies = dependencySorter.sort().reverse();
  }

  recurseDependencies(jsonFile, root, visitedPaths = {}, packagePath = '') {
    return this.zip
      .file(jsonFile)
      .async('string')
      .then(content => {
        const json = JSON.parse(content);
        const dependencies = json['preloadedDependencies'] || [];
        // Make a copy so that we are not modifying the same object
        visitedPaths = {
          ...visitedPaths,
        };
        if (root) {
          this.rootConfig = json;
        }
        return Promise.all(
          dependencies.map(dep => {
            const packagePath = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}/`;
            if (root && !this.library && dep.machineName === json.mainLibrary) {
              this.library = `${dep.machineName} ${dep.majorVersion}.${dep.minorVersion}`;
            }
            if (visitedPaths[packagePath]) {
              // If we have visited this dependency before
              // then we are in a cyclic dependency graph
              // so stop!
              return Promise.resolve(packagePath);
            }
            visitedPaths[packagePath] = true;
            return this.recurseDependencies(
              packagePath + 'library.json',
              false,
              visitedPaths,
              packagePath
            ).then(() => packagePath);
          })
        ).then(dependencies => {
          if (packagePath) {
            const preloadedJs = (json['preloadedJs'] || []).map(js => js.path);
            const preloadedCss = (json['preloadedCss'] || []).map(css => css.path);
            this.dependencies.push({
              packagePath,
              dependencies,
              preloadedCss,
              preloadedJs,
            });
          }
        });
      });
  }

  processJsDependencies() {
    this.jsDependencies = this.sortedDependencies.map(dependency => {
      const fileMap = {};
      const jsMap = { dependency, fileMap };
      this.jsDependencies[dependency].map(jsDep => {
        const pathPrefix =
          jsDep
            .split('/')
            .slice(0, -1)
            .join('/') + '/';
        const js = Object.entries(this.packageFiles[dependency]).reduce(
          (script, [key, value]) =>
            script.replace(
              new RegExp(`(['"]{1})${escapeRegExp(key.replace(pathPrefix, ''))}\\1`, 'g'),
              `$1${value}$1`
            ),
          this.packageFiles[dependency][jsDep]
        );
        fileMap[jsDep] = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
      });
      return jsMap;
    });
  }

  processCssDependencies() {
    this.cssDependencies = this.sortedDependencies.map(dependency => {
      const fileMap = {};
      const cssMap = { dependency, fileMap };
      this.cssDependencies[dependency].map(cssDep => {
        const pathPrefix =
          cssDep
            .split('/')
            .slice(0, -1)
            .join('/') + '/';
        const css = Object.entries(this.packageFiles[dependency]).reduce(
          (script, [key, value]) =>
            script.replace(
              new RegExp(
                `(url\\(['"]?)(${escapeRegExp(
                  key.replace(pathPrefix, '')
                )})(\\?[^'^"]+)?(['"]?\\))`,
                'g'
              ),
              `$1${value}$4`
            ),
          this.packageFiles[dependency][cssDep]
        );
        fileMap[cssDep] = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
      });
      return cssMap;
    });
  }

  processContent(file) {
    const fileName = file.name.replace('content/', '');
    if (fileName === 'content.json') {
      return file.async('string').then(content => {
        this.contentJson = content;
      });
    }
    // Create blob urls for every item in the content folder
    return file.async('uint8array').then(uint8array => {
      this.contentPaths[fileName] = createBlobUrl(uint8array, fileName);
    });
  }

  processPackageFile(file, packagePath) {
    const fileName = file.name.replace(packagePath, '');
    const jsFile = this.jsDependencies[packagePath].indexOf(fileName) > -1;
    const cssFile = this.cssDependencies[packagePath].indexOf(fileName) > -1;
    if (jsFile || cssFile) {
      if (jsFile) {
        this.loadedJs[file.name] = true;
      } else if (cssFile) {
        this.loadedCss[file.name] = true;
      }
      return file.async('string').then(content => {
        this.packageFiles[packagePath][fileName] = content;
      });
    }
    return file.async('uint8array').then(uint8array => {
      this.packageFiles[packagePath][fileName] = createBlobUrl(uint8array, fileName);
    });
  }

  processFiles() {
    const contentFiles = this.zip.file(/content\//);
    const promises = [];
    promises.push(...contentFiles.map(file => this.processContent(file)));
    promises.push(
      ...Object.keys(this.packageFiles).map(packagePath => {
        const packageFiles = this.zip.file(new RegExp(escapeRegExp(packagePath)));
        return Promise.all(packageFiles.map(file => this.processPackageFile(file, packagePath)));
      })
    );
    return Promise.all(promises);
  }
}
