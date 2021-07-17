<template>

  <div>
    <component
      :is="componentName"
      v-if="componentName"
      :json="childJson"
    />
  </div>

</template>


<script>

  import { unzip, strFromU8 } from 'fflate';
  import get from 'lodash/get';
  import client from 'kolibri.client';
  import logger from 'kolibri.lib.logging';
  import xmlParse from '../utils/xml';
  import AssessmentItem from './AssessmentItem';
  import AssessmentSection from './AssessmentSection';
  import AssessmentTest from './AssessmentTest';

  const logging = logger.getLogger(__filename);

  const domParser = new DOMParser();

  class Zip {
    constructor(file) {
      this.zipfile = file;
    }

    _getFiles(filter) {
      return new Promise((resolve, reject) => {
        unzip(this.zipfile, { filter }, (err, unzipped) => {
          if (err) {
            reject(err);
            return;
          }
          if (!unzipped) {
            reject('No files found');
            return;
          }
          resolve(Object.entries(unzipped).map(([name, obj]) => ({ name, obj })));
        });
      });
    }

    file(filename) {
      return this._getFiles(file => file.name === filename).then(files => files[0]);
    }
    files(path) {
      return this._getFiles(file => file.name.startsWith(path));
    }

    fileString(filename) {
      return this.file(filename).then(file => strFromU8(file.obj));
    }
  }

  function parseIMSManifest(IMSPackage) {
    return IMSPackage.fileString(`imsmanifest.xml`)
      .then(manifest => {
        const json = xmlParse(manifest);
        return get(json, ['manifest', '0', 'resources', '0', 'resource'], []);
      })
      .catch(() => Promise.reject('Manifest file not found'));
  }

  export default {
    name: 'QTIViewer',
    components: {
      AssessmentItem,
      AssessmentSection,
      AssessmentTest,
    },
    data: () => ({
      json: null,
      dom: null,
      // Is the qti viewer loading?
      loading: true,
      resource: null,
    }),
    provide() {
      return {
        getFile: this.getFile,
        getFileString: this.getFileString,
        getFilePath: this.getFilePath,
        getDom: this.getDom,
      };
    },
    computed: {
      rootName() {
        return ['assessmentTest', 'assessmentSection', 'assessmentItem'].find(
          a => this.json && this.json[a]
        );
      },
      componentName() {
        if (this.rootName) {
          return this.rootName.slice(0, 1).toUpperCase() + this.rootName.slice(1);
        }
        return null;
      },
      childJson() {
        return this.json && this.rootName && get(this.json, [this.rootName, '0'], {});
      },
    },
    created() {
      this.loadAssessmentTest();
    },
    methods: {
      getFile(filePath) {
        if (!this.qtiFile) {
          return Promise.reject('QTI File has not been loaded');
        }
        return this.qtiFile.file(filePath);
      },
      getFileString(filePath) {
        if (!this.qtiFile) {
          return Promise.reject('QTI File has not been loaded');
        }
        return this.qtiFile.fileString(filePath);
      },
      getFilePath() {
        return this.resource['@href'];
      },
      getDom() {
        return this.dom;
      },
      loadQtiFile() {
        if (this.defaultFile) {
          if (!this.qtiFile) {
            return client({
              method: 'get',
              url: this.defaultFile.storage_url,
              responseType: 'arraybuffer',
              cacheBust: false,
            }).then(response => {
              this.qtiFile = new Zip(new Uint8Array(response.data));
              return this.setResource();
            });
          } else {
            return Promise.resolve();
          }
        }
      },
      setResource() {
        return parseIMSManifest(this.qtiFile).then(manifest => {
          if (!manifest.length) {
            return Promise.reject('IMS Package has no resources');
          }
          const resource = manifest.find(m => m['@identifier'] === this.options.entry);
          if (resource) {
            this.resource = resource;
          } else {
            this.resource = manifest[0];
          }
        });
      },
      loadAssessmentTest() {
        if (this.defaultFile && this.defaultFile.storage_url) {
          this.loading = true;
          this.loadQtiFile()
            .then(() => {
              return this.getFileString(this.getFilePath());
            })
            .then(qtiXML => {
              this.json = xmlParse(qtiXML);
              this.dom = domParser.parseFromString(qtiXML.trim(), 'text/xml');
              this.loading = false;
            })
            .catch(reason => {
              logging.debug('There was an error loading the QTI XML: ', reason);
              this.$emit('itemError', reason);
            });
        }
      },
    },
  };

</script>
