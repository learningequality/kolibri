<template>

  <div class="dropdown">
    <button>Download Content &#9660</button>
    <div class="dropdown-items">
      <a class="dropdown-item" v-for="file in files" href="{{ file.download_url }}">
        {{ file.preset + ' (' + prettifyFileSize(file.file_size) + ')' }}
      </a>
    </div>
  </div>

</template>


<script>

  const filesize = require('filesize');

  module.exports = {
    $trNameSpace: 'contentRender',
    $trs: {
      downloadMedia: 'Download Media',
    },
    props: {
      files: {
        type: Array,
        default: () => [],
      },
    },
    components: {
      'icon-button': require('kolibri/coreVue/components/iconButton'),
    },
    computed: {
      downloadMediaText() {
        return this.$tr('downloadMedia');
      },
    },
    methods: {
      /**
       * Creates a human readable file size.
       */
      prettifyFileSize(bytes) {
        return filesize(bytes);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .dropdown
    position: relative
    display: inline-block
    &:hover
      .dropdown-items
        display: block

  .dropdown-items
    position: absolute
    display: none
    width: 100%
    background-color: white
    box-shadow: 1px 1px 4px 0 #cccccc

  .dropdown-item
    display: block
    padding: 1em
    text-decoration: none
    color: #3a3a3a
    &:hover
      background-color: #e2d1e0

</style>
