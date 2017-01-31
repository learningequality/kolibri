<template>

  <div class="dropdown">
    <button
      ref="dropdownbutton"
      class="dropdown-button"
      @click="toggleDropdown"
      aria-haspopup="true">
      <span class="dropdown-button-text" :class="{'dropdown-button-text-open': dropdownOpen}">
        {{ $tr('downloadContent') }}
      </span>
    </button>
    <ul
      ref="dropdownitems"
      class="dropdown-items"
      :class="{ 'dropdown-open': dropdownOpen }"
      :aria-hidden="dropdownOpenText"
      role="menu">
      <li
        v-for="file in files"
        class="dropdown-item"
        role="presentation">
        <a
          download
          class="dropdown-item-link"
          @click="toggleDropdown"
          :href="file.download_url"
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
        dropdownOpen: false,
        focusedItemIndex: 0,
      };
    },
    computed: {
      dropdownOpenText() {
        return String(this.dropdownOpen);
      },
      dropdownItems() {
        const listItems = Array.from(this.$refs.dropdownitems.children);
        const anchorItems = [];
        listItems.forEach((li) => {
          anchorItems.push(li.children[0]);
        });
        return anchorItems;
      },
      focusableItems() {
        let focusableItems = [];
        focusableItems.push(this.$refs.dropdownbutton);
        focusableItems = focusableItems.concat(this.dropdownItems);
        return focusableItems;
      },
    },
    methods: {
      prettifyFileSize(bytes) {
        return filesize(bytes);
      },
      toggleDropdown() {
        this.dropdownOpen = !this.dropdownOpen;
        this.focusedItemIndex = 0;
      },
      handleKeys(e) {
        // TODO: More robust way of handling keyboard input.
        if (this.dropdownOpen) {
          switch (e.keyCode) {
            case 40: // down
              e.stopPropagation();
              e.preventDefault();
              this.focusOnItem(this.focusedItemIndex + 1);
              return;

            case 38: // up
              e.stopPropagation();
              e.preventDefault();
              this.focusOnItem(this.focusedItemIndex - 1);
              return;

            case 9: // tab
              e.stopPropagation();
              e.preventDefault();
              if (this.focusedItemIndex === (this.focusableItems.length - 1)) {
                this.toggleDropdown();
                return;
              }
              this.focusOnItem(this.focusedItemIndex + 1);
              return;

            case 27: // esc
              e.stopPropagation();
              e.preventDefault();
              this.toggleDropdown();
              return;

            default:
              return;
          }
        }
      },
      focusOnItem(index) {
        this.focusedItemIndex =
          Math.min(Math.max(index, 0), (this.focusableItems.length - 1));
        this.focusableItems[this.focusedItemIndex].focus();
      },
    },
    mounted() {
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
    padding: 0.5em
    margin-top: 1em
    margin-bottom: 1em
    font-size: smaller

  .dropdown-button-text
    &:after
      padding-left: 0.5em
      content: '\25BC'

  .dropdown-button-text-open
    &:after
      content: '\25b2'

  .dropdown-items
    background-color: white
    list-style: none
    padding: 0
    margin: 0
    margin-top: -0.8em
    display: none
    position: absolute

  .dropdown-item
    padding: 0
    margin: 0
    width: 100%
    position: relative
    display: block

  .dropdown-item-link
    padding: 0.5em
    margin: 0
    width: 100%
    display: block
    text-decoration: none
    white-space: nowrap
    font-size: smaller
    &:focus
      background-color: $core-action-light
    &:hover
      background-color: $core-action-light
      outline: $core-action-light 2px solid

  .dropdown-open
    display: block

</style>
