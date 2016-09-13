<template>

  <a :href="downloadLink">
    <icon-button :text="downloadMediaText">
      <svg src="download.svg"></svg>
    </icon-button>
  </a>

</template>


<script>

  module.exports = {
    $trNameSpace: 'contentRender',
    $trs: {
      downloadMedia: 'Download Media',
    },
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
    components: {
      'icon-button': require('icon-button'),
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
      downloadMediaText() {
        return this.$tr('downloadMedia');
      },
      downloadLink() {
        const filePath = this.availableFiles[0].storage_url;
        // Extract filename from the storage url.
        const filename = filePath.replace(/^.*[\\\/]/, '');
        const newFilename = this.sanitizeFilename(this.title);
        return `/downloadcontent/${filename}/${newFilename}`;
      },
    },
    methods: {
      /**
      * Method that returns a safe filename.
      */
      sanitizeFilename(filename) {
        let sanitizedFilename = filename.replace(/[^a-z0-9+]+/gi, '_');
        sanitizedFilename = sanitizedFilename.replace(/_$/, '');
        sanitizedFilename = sanitizedFilename.toLowerCase();
        sanitizedFilename = sanitizedFilename.substring(0, 50);
        if (!sanitizedFilename.trim()) {
          sanitizedFilename = 'download';
        }
        return `${sanitizedFilename}.${this.extension}`;
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
