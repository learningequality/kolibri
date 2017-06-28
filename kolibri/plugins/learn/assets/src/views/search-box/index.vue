<template>

  <form class="search-box" @submit.prevent="search">
    <input
      type="search"
      class="search-input"
      ref="searchInput"
      v-model="searchQuery"
      :placeholder="$tr('search')"
      :style="{ width: width }"
      @keydown.esc.prevent="handleEscKey"
    >

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
      width: {
        type: String,
        required: false,
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
    display: inline-block
    background-color: white

  .search-input
    background-color: white
    color: $core-text-default
    border: none
    width: 150px
    min-width: 150px
    max-width: 400px
    height: 36px
    padding: 0
    padding-left: 8px
    padding-right: 8px
    margin: 0
    vertical-align: middle

    &::placeholder
      color: $core-text-annotation

  .search-clear-button
    color: $core-text-default
    width: 24px
    height: 24px
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
    margin-left: 8px

</style>
