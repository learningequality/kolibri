<template>

  <form class="search-box" @submit.prevent="search">
    <div class="search-box-row">
      <input
        type="search"
        class="search-input"
        ref="searchInput"
        v-model="searchQuery"
        :placeholder="$tr('search')"
        @keydown.esc.prevent="handleEscKey"
      >
      <div class="search-clear-submit">
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
            :ariaLabel="$tr('search')"
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
    $trNameSpace: 'learnSearchBox',
    $trs: {
      search: 'Search',
      clear: 'Clear',
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
      search() {
        if (this.searchQuery !== '') {
          this.$router.push({
            name: PageNames.SEARCH,
            query: { query: this.searchQuery },
          });
        }
      },
      handleEscKey() {
        if (this.searchQuery === '') {
          this.$emit('closeSearchBox');
        } else {
          this.searchQuery = '';
        }
      },
      emitClick(event) {
        this.$emit('clickedTarget', event.target);
      },
    },
    created() {
      window.addEventListener('click', this.emitClick);
    },
    beforeDestroy() {
      window.removeEventListener('click', this.emitClick);
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
    max-width: 400px
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

  .search-clear-submit
    display: table-cell
    width: 76px

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
