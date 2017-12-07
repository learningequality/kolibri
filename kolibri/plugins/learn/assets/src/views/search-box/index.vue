<template>

  <form
    class="search-box"
    @submit.prevent="search"
    @keydown.esc.prevent="handleEscKey">
    <div class="search-box-row">
      <label class="visuallyhidden" for="searchfield">{{ $tr('searchBoxLabel') }}</label>
      <input
        v-model="searchQuery"
        id="searchfield"
        type="search"
        class="search-input"
        ref="searchInput"
        :placeholder="$tr('searchBoxLabel')"
      >
      <div class="search-buttons-wrapper">
        <ui-icon-button
          icon="clear"
          color="black"
          size="small"
          class="search-clear-button"
          :class="searchQuery === '' ? '' : 'search-clear-button-visble'"
          :ariaLabel="$tr('clearButtonLabel')"
          @click="searchQuery = ''"
        />

        <div class="search-submit-button-wrapper">
          <ui-icon-button
            type="secondary"
            color="white"
            class="search-submit-button"
            :class="{ 'rtl-icon': icon === 'arrow_forward' && isRtl }"
            :icon="icon"
            :ariaLabel="$tr('startSearchButtonLabel')"
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
    watch: {
      searchTerm(val) {
        this.searchQuery = val || '';
      },
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
