<template>

  <div class="search-box-wrapper">
    <div ref="toggleBtnAndSearchBox">
      <ui-icon-button
        v-show="searchBoxIsDropdown"
        ref="toggleBtn"
        type="primary"
        color="primary"
        :disableRipple="true"
        @click="toggleDropdownSearchBox"
      >
        <mat-svg name="search" category="action" class="search-icon" />
      </ui-icon-button>

      <div v-show="searchBoxIsVisible" :class="{ 'search-box-dropdown': searchBoxIsDropdown }">
        <search-box
          ref="searchBox"
          :icon="searchBoxIsDropdown ? 'arrow_forward' : 'search'"
          :class="searchBoxIsDropdown ? '' : 'search-box-within-action-bar'"
          @closeDropdownSearchBox="closeDropdownSearchBox"
        />
      </div>
    </div>

    <div v-show="searchBoxIsDropdown && searchBoxIsOpen" class="search-box-dropdown-backdrop"></div>
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import searchBox from './search-box';

  export default {
    name: 'actionBarSearchBox',
    components: {
      uiIconButton,
      searchBox,
    },
    mixins: [responsiveWindow],
    data() {
      return {
        searchQuery: this.searchTerm,
        searchBoxIsOpen: false,
      };
    },
    computed: {
      searchBoxIsDropdown() {
        return this.windowSize.breakpoint <= 0;
      },
      searchBoxIsVisible() {
        if (this.searchBoxIsDropdown) {
          return this.searchBoxIsOpen;
        }
        return true;
      },
    },
    created() {
      window.addEventListener('click', this.handleClick);
      window.addEventListener('focusin', this.handleFocusIn);
    },
    beforeDestroy() {
      window.removeEventListener('click', this.handleClick);
      window.removeEventListener('focusin', this.handleFocusIn);
    },
    methods: {
      focusOnSearchBox() {
        this.$nextTick(() => {
          this.$refs.searchBox.$refs.searchInput.focus();
        });
      },
      openDropdownSearchBox() {
        this.searchBoxIsOpen = true;
        this.focusOnSearchBox();
      },
      closeDropdownSearchBox() {
        this.searchBoxIsOpen = false;
      },
      toggleDropdownSearchBox() {
        if (this.searchBoxIsOpen) {
          this.closeDropdownSearchBox();
        } else {
          this.openDropdownSearchBox();
        }
      },
      handleClick(event) {
        if (this.searchBoxIsOpen && !this.$refs.toggleBtnAndSearchBox.contains(event.target)) {
          this.closeDropdownSearchBox();
        }
      },
      handleFocusIn(event) {
        if (this.searchBoxIsOpen && !this.$refs.toggleBtnAndSearchBox.contains(event.target)) {
          this.closeDropdownSearchBox();
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .search-box-wrapper
    display: inline-block
    vertical-align: middle

  .search-box-dropdown
    position: fixed
    top: 55px
    left: 0
    right: 0
    z-index: 4 // match app-bar
    background-color: $core-action-normal
    padding-right: 16px
    padding-left: 16px
    padding-top: 10px
    padding-bottom: 10px

  .search-box-dropdown-backdrop
    position: fixed
    top: 111px
    right: 0
    bottom: 0
    left: 0
    z-index: 4
    background-color: rgba(0, 0, 0, 0.7)

  .search-icon
    fill: white

</style>
