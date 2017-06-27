<template>

  <div class="search-box-wrapper">
    <div v-show="showSearchBox" :class="{ 'search-box-dropdown': showDropdownSearchBox }">
      <form
        @submit.prevent="search"
        class="search-box">
        <input
          type="search"
          :placeholder="$tr('search')"
          v-model="searchQuery"
          class="search-input"
          ref="searchInput"
        >

        <ui-icon-button
          :ariaLabel="$tr('clear')"
          icon="clear"
          color="black"
          class="search-clear-button"
          :class="searchQuery === '' ? '' : 'search-clear-button-visble'"
          @click="searchQuery = ''"
          size="small"
        />

        <div class="search-submit-button-wrapper">
          <ui-icon-button
            :ariaLabel="$tr('search')"
            :icon="showDropdownSearchBox ? 'arrow_forward' : 'search'"
            type="secondary"
            color="white"
            @click="search"
            class="search-submit-button"
          />
        </div>
      </form>
    </div>

    <ui-icon-button
      v-show="showSearchToggleBtn"
      icon="search"
      type="primary"
      color="primary"
      @click="toggleDropdownSearchBox"
    />
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import { PageNames } from '../../constants';
  import uiIconButton 'keen-ui/src/UiIconButton';


  export default {
    $trNameSpace: 'learnSearchBox',
    $trs: {
      search: 'Search',
      clear: 'Clear',
    },
    mixins: [responsiveWindow, responsiveElement],
    components: {
      uiIconButton,
    },
    data() {
      return {
        searchQuery: this.searchTerm,
        searchBoxOpen: false,
      };
    },
    computed: {
      isWithinSearchPage() {
        return this.pageName === PageNames.SEARCH || this.pageName === PageNames.SEARCH_ROOT;
      },
      showSearchBox() {
        if (this.showDropdownSearchBox) {
          return !this.isWithinSearchPage && this.searchBoxOpen;
        }
        return !this.isWithinSearchPage;
      },
      showDropdownSearchBox() {
        return this.windowSize.breakpoint === 0;
      },
      showSearchToggleBtn() {
        return this.windowSize.breakpoint === 0 && !this.isWithinSearchPage;
      },
      searchInputStyle() {
        if (this.windowSize.breakpoint === 0) {
          return { width: '40px' };
        } else if (this.windowSize.breakpoint === 1) {
          return { width: '150px' };
        }
        return {};
      },
    },
    methods: {
      search() {
        if (this.searchQuery !== '') {
          this.$router.push({
            name: PageNames.SEARCH,
            query: { query: this.searchQuery },
          });
        }
      },
      toggleDropdownSearchBox() {
        this.searchBoxOpen = !this.searchBoxOpen;
        if (this.searchBoxOpen) {
          this.$nextTick(() => {
            this.$refs.searchInput.focus();
          });
        }
      },
    },
    watch: {
      searchTerm(val) {
        this.searchQuery = val || '';
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        searchTerm: state => state.pageState.searchTerm,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .search-box-wrapper
    display: inline-block

  .search-box
    display: inline-block
    background-color: white

  .search-input
    background-color: white
    color: $core-text-default
    border: none
    width: 150px
    height: 36px
    padding: 0
    padding-left: 0.5em
    padding-right: 0.5em
    margin: 0
    vertical-align: middle

  ::placeholder
      color: $core-text-annotation

  .search-clear-button
    color: $core-text-default
    width: 18px
    height: 22px
    visibility: hidden
    vertical-align: middle

  .search-clear-button-visble
    visibility: visible

  .search-submit-button
    width: 36px
    height: 36px

  .search-submit-button-wrapper
    display: inline-block
    background-color: $core-action-dark
    vertical-align: middle

  .search-box-dropdown
    position: fixed
    top: 56px
    left: 0
    z-index: 4 // match app-bar
    background-color: $core-action-normal
    padding: 16px

    .search-input
      width: calc(100vw - 104px)

</style>
