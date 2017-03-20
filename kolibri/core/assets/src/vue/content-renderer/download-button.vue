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
      role="menu"
      :hidden="!dropdownOpen"
    >
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
      downloadContent: 'Download content',
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
              break;

            case 38: // up
              e.stopPropagation();
              e.preventDefault();
              this.focusOnItem(this.focusedItemIndex - 1);
              break;

            case 9: // tab
              e.stopPropagation();
              e.preventDefault();
              if (this.focusedItemIndex === (this.focusableItems.length - 1)) {
                this.toggleDropdown();
                break;
              }
              this.focusOnItem(this.focusedItemIndex + 1);
              break;

            case 27: // esc
              e.stopPropagation();
              e.preventDefault();
              this.toggleDropdown();
              break;

            default:
              break;
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

  @require '~kolibri.styles.definitions'

  .dropdown
    position: relative
    display: inline-block

  .dropdown-button
    margin-top: 1em
    margin-bottom: 1em
    padding: 0.5em
    font-size: smaller

  .dropdown-button-text
    &:after
      padding-left: 0.5em
      content: '\25BC'

  .dropdown-button-text-open
    &:after
      content: '\25b2'

  .dropdown-items
    position: absolute
    margin: 0
    margin-top: -0.8em
    padding: 0
    background-color: white
    list-style: none

  .dropdown-item
    position: relative
    display: block
    margin: 0
    padding: 0
    width: 100%

  .dropdown-item-link
    display: block
    margin: 0
    padding: 0.5em
    width: 100%
    text-decoration: none
    white-space: nowrap
    font-size: smaller
    &:focus
      background-color: $core-action-light
    &:hover
      outline: $core-action-light 2px solid
      background-color: $core-action-light

</style>
