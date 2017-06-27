<template>

  <div class="search-box-wrapper">
    <div v-show="showSearchBox" :class="{ 'search-box-dropdown': showDropdownSearchBox }">
      <search-box
        ref="searchBox"
        :icon="showDropdownSearchBox ? 'arrow_forward' : 'search'"
        :width="showDropdownSearchBox ? 'calc(100vw - 120px)' : '150px'"
      />
    </div>

    <ui-icon-button
      v-show="showDropdownSearchBox"
      icon="search"
      type="primary"
      color="primary"
      @click="toggleDropdownSearchBox"
    />

    <div
      v-show="showDropdownSearchBox && searchBoxOpen"
      class="backdrop"
      @click="toggleDropdownSearchBox">
    </div>
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { PageNames } from '../../constants';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import searchBox from '../search-box';

  export default {
    $trNameSpace: 'learnSearchBox',
    $trs: {
      search: 'Search',
      clear: 'Clear',
    },
    mixins: [responsiveWindow],
    components: {
      uiIconButton,
      searchBox,
    },
    data() {
      return {
        searchQuery: this.searchTerm,
        searchBoxOpen: false,
      };
    },
    computed: {
      showDropdownSearchBox() {
        return this.windowSize.breakpoint <= 0;
      },
      showSearchBox() {
        if (this.showDropdownSearchBox) {
          return this.searchBoxOpen;
        }
        return true;
      },
    },
    methods: {
      toggleDropdownSearchBox() {
        this.searchBoxOpen = !this.searchBoxOpen;
        if (this.searchBoxOpen) {
          this.$nextTick(() => {
            this.$refs.searchBox.$refs.searchInput.focus();
          });
        }
      },
      search() {
        if (this.searchQuery !== '') {
          this.$router.push({
            name: PageNames.SEARCH,
            query: { query: this.searchQuery },
          });
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .search-box-wrapper
    display: inline-block

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

  .backdrop
    position: fixed
    top: 111px
    right: 0
    bottom: 0
    left: 0
    z-index: 4
    background-color: rgba(0, 0, 0, 0.7)

</style>
