<template>

  <div class="dropdown">
    <icon-button
      v-el:dropdownbutton
      :text="$tr('downloadContent')"
      :primary="false"
      :icononright="true"
      class="dropdown-button"
      @click="toggleDropdown"
      aria-haspopup="true">
      <svg src="./expand.svg"></svg>
    </icon-button>
    <ul
      v-el:dropdownitems
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
        itemSelected: 0,
      };
    },
    computed: {
      dropDownOpenText() {
        return String(this.dropdownopen);
      },
      dropDownItems() {
        let listItems = this.$els.dropdownitems.children;
        listItems = [...listItems];
        const anchorItems = [];
        listItems.forEach((li) => {
          anchorItems.push(li.children[0]);
        });
        return anchorItems;
      },
      focusableItems() {
        let focusableItems = [];
        focusableItems.push(this.$els.dropdownbutton);
        focusableItems = focusableItems.concat(this.dropDownItems);
        return focusableItems;
      },
    },
    methods: {
      prettifyFileSize(bytes) {
        return filesize(bytes);
      },
      toggleDropdown() {
        this.dropdownopen = !this.dropdownopen;
        this.itemSelected = 0;
      },
      handleKeys(e) {
        if (this.dropdownopen) {
          switch (e.keyCode) {
            case 40: // down
              e.stopPropagation();
              e.preventDefault();
              this.itemSelected++;
              this.focusOnItem();
              return;

            case 38: // up
              e.stopPropagation();
              e.preventDefault();
              this.itemSelected--;
              this.focusOnItem();
              return;

            case 9: // tab
              e.stopPropagation();
              e.preventDefault();
              if (this.itemSelected === (this.focusableItems.length - 1)) {
                this.toggleDropdown();
                return;
              }
              this.itemSelected++;
              this.focusOnItem();
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
      focusOnItem() {
        this.itemSelected =
          Math.min(Math.max(this.itemSelected, 0), (this.focusableItems.length - 1));
        this.focusableItems[this.itemSelected].focus();
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
    margin-top: 2px
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

  .dropdownopen
    display: block

</style>
