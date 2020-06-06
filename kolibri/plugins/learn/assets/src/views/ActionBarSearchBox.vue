<template>

  <div class="search-box-wrapper">
    <div ref="toggleBtnAndSearchBox">
      <KIconButton
        v-show="searchBoxIsDropdown"
        ref="toggleBtn"
        icon="search"
        size="small"
        style="margin-left: 8px;"
        :color="$themeTokens.textInverted"
        @click="toggleDropdownSearchBox"
      />

      <div
        v-show="searchBoxIsVisible"
        :class="{ 'search-box-dropdown': searchBoxIsDropdown }"
        :style="{ backgroundColor: searchBoxIsDropdown ? $themeTokens.primary : '' }"
      >
        <SearchBox
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

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import SearchBox from './SearchBox';

  export default {
    name: 'ActionBarSearchBox',
    components: {
      SearchBox,
    },
    mixins: [responsiveWindowMixin],
    data() {
      return {
        searchBoxIsOpen: false,
      };
    },
    computed: {
      searchBoxIsDropdown() {
        return this.windowIsSmall;
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


<style lang="scss" scoped>

  .search-box-wrapper {
    display: inline-block;
    vertical-align: middle;
  }

  .search-box-dropdown {
    position: fixed;
    top: 55px;
    right: 0;
    left: 0;
    z-index: 4; // match app-bar
    padding-top: 10px;
    padding-right: 16px;
    padding-bottom: 10px;
    padding-left: 16px;
  }

  .search-box-dropdown-backdrop {
    position: fixed;
    top: 111px;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 4;
    background-color: rgba(0, 0, 0, 0.7);
  }

  .search-icon {
    fill: white;
  }

</style>
