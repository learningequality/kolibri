<template>

  <form
    class="search-box"
    @submit.prevent="search"
    @keydown.esc.prevent="handleEscKey">
    <div class="search-box-row">
      <label class="visuallyhidden" for="searchfield">{{ $tr('search') }}</label>
      <input
        v-model="searchQuery"
        id="searchfield"
        type="search"
        class="search-input"
        ref="searchInput"
        :placeholder="$tr('search')"
      >
      <div class="search-buttons-wrapper">
        <ui-icon-button
          icon="clear"
          color="black"
          size="small"
          class="search-clear-button"
          :class="searchQuery === '' ? '' : 'search-clear-button-visble'"
          :ariaLabel="$tr('clear')"
          @click="searchQuery = ''"
        />

        <div class="search-submit-button-wrapper">
          <ui-icon-button
            type="secondary"
            color="white"
            class="search-submit-button"
            :icon="icon"
            :ariaLabel="$tr('start')"
            @click="search"
          />
        </div>
      </div>
    </div>
  </form>

</template>


<script>

  import { PageNames } from '../../constants';
  import uiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'searchBox',
    $trs: {
      searchBoxLabel: 'Search',
      clearButtonLabel: 'Clear',
      startSearchButtonLabel: 'Start search',
    },
    components: {
      uiIconButton,
    },
    props: {
      icon: {
        type: String,
        default: 'search',
      },
    },
    data() {
      return {
        searchQuery: this.searchTerm,
      };
    },
    methods: {
      handleEscKey() {
        if (this.searchQuery === '') {
          this.$emit('closeDropdownSearchBox');
        } else {
          this.searchQuery = '';
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
    watch: {
      searchTerm(val) {
        this.searchQuery = val || '';
      },
    },
    vuex: {
      getters: {
        searchTerm: state => state.pageState.searchTerm,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .search-box
    display: table
    width: 100%
    max-width: 450px
    background-color: white

  .search-box-within-action-bar
    width: 235px

  .search-box-row
    display: table-row

  .search-input
    display: table-cell
    width: 100%
    height: 36px
    margin: 0
    padding: 0
    padding-left: 8px
    vertical-align: middle
    border: none
    background-color: white
    color: $core-text-default

    &::placeholder
      color: $core-text-annotation

  .search-buttons-wrapper
    display: table-cell
    text-align: right
    width: 78px

  .search-clear-button
    visibility: hidden
    width: 24px
    height: 24px
    margin-right: 8px
    margin-left: 8px
    vertical-align: middle
    color: $core-text-default

  .search-clear-button-visble
    visibility: visible

  .search-submit-button
    width: 36px
    height: 36px

  .search-submit-button-wrapper
    display: inline-block
    vertical-align: middle
    background-color: $core-action-dark

</style>
