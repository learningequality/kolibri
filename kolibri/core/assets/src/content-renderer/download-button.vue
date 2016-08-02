<template>

  <button v-on:click="downloadContent">Download</button>

</template>


<script>

  const downloadjs = require('./download.js');

  module.exports = {
    props: {
      kind: {
        type: String,
        required: true,
      },
      files: {
        type: Array,
        default: () => [],
      },
      available: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        default: '',
      },
    },
    computed: {
      contentType() {
        if (typeof this.kind !== 'undefined' & typeof this.extension !== 'undefined') {
          return `${this.kind}/${this.extension}`;
        }
        return undefined;
      },
      extension() {
        if (this.availableFiles.length > 0) {
          return this.availableFiles[0].extension;
        }
        return undefined;
      },
      availableFiles() {
        return this.files.filter(
          (file) => !file.thumbnail & !file.supplementary & file.available
        );
      },
    },
    methods: {
      /**
      * Method that downloads the content.
      */
      downloadContent() {
        const sanitizedFilename = this.sanitizeFilename(this.title);
        const x = new XMLHttpRequest();
        x.open('GET', this.availableFiles[0].storage_url, true);
        x.responseType = 'blob';
        x.onload = function (e) {
          downloadjs(e.target.response, sanitizedFilename, this.contentType);
        };
        x.send();
      },
      /**
      * Method that returns a safe filename.
      */
      sanitizeFilename(filename) {
        let sanitizedFilename = filename.replace(/[^a-z0-9+]+/gi, '_');
        sanitizedFilename = sanitizedFilename.toLowerCase();
        sanitizedFilename = sanitizedFilename.substring(0, 25);
        if (!sanitizedFilename.trim()) {
          sanitizedFilename = 'download';
        }
        return sanitizedFilename;
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
