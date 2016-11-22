<template>

  <div class="dropdown">
    <icon-button
      :text="$tr('downloadContent')"
      :primary="false"
      :icononright="true"
      class="dropdown-button"
      @click="toggleDropdown"
      aria-haspopup="true"
    >
      <svg src="./expand.svg"></svg>
    </icon-button>
    <ul
      class="dropdown-items"
      :class="{ dropdownopen: dropdownopen }"
      :aria-hidden="dropDownOpenText"
      role="menu">
      <li
        v-for="file in files"
        class="dropdown-item"
        role="presentation">
        <a
          class="dropdown-item-link"
          @click="toggleDropdown"
          href="{{ file.download_url }}"
          role="menuitem">
          {{ file.preset + ' (' + prettifyFileSize(file.file_size) + ')' }}
        </a>
      </li>
    </ul>
  </div>

</template>


<script>

  const filesize = require('filesize');

  module.exports = {
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    $trNameSpace: 'downloadButton',
    $trs: {
      downloadContent: 'Download Content',
    },
    props: {
      files: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        dropdownopen: false,
      };
    },
    computed: {
      dropDownOpenText() {
        return String(this.dropdownopen);
      },
    },
    methods: {
      toggleDropdown() {
        this.dropdownopen = !this.dropdownopen;
      },
      prettifyFileSize(bytes) {
        return filesize(bytes);
      },
      handleKeys(e) {
        if (this.dropdownopen) {
          if (e.keyCode === 27) {
            this.toggleDropdown();
          }
        }
      },
    },
    ready() {
      document.addEventListener('keydown', this.handleKeys);
    },
    beforeDestroy() {
      document.removeEventListener('keydown', this.handleKeys);
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .dropdown
    display: inline-block
    position: relative

  .dropdown-button
    padding-right: 0.5em
    padding-left: 0.5em
    font-size: smaller

  .dropdown-items
    background-color: white
    list-style: none
    padding: 0
    margin: 0
    margin-top: 1px
    display: none
    position: absolute

  .dropdown-item
    padding: 0.5em
    margin: 0
    width: 100%
    position: relative
    display: block
    &:hover
      background-color: $core-action-light

  .dropdown-item-link
    display: block
    text-decoration: none
    white-space: nowrap
    font-size: smaller

  .dropdownopen
    display: block

</style>
