<template>

  <div>
    <div>
      <input
        type="search"
        placeholder="Find content..."
        autocomplete="off"
        v-focus-model="focused"
        v-model="searchterm"
        id="search"
        name="search"
        @keydown="isTyping()"
        @keyup="searchContent(1) | debounce 500">
      <button type="reset" @click="reFocus()">
        X
      </button>
    </div>

    <h4 v-show="!typing && !searchLoading">
      {{ prompttext }}
    </h4>

    <div :class="{ 'search-in-progress': typing || searchLoading }">
      <card-grid v-if="searchTopics.length > 0">
        <topic-card
          v-for="topic in searchTopics"
          class="card"
          :id="topic.id"
          :title="topic.title"
          :ntotal="topic.n_total"
          :ncomplete="topic.n_complete">
        </topic-card>
      </card-grid>

      <card-grid v-if="searchContents.length > 0">
        <content-card
          v-for="content in searchContents"
          class="card"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :id="content.id">
        </content-card>
      </card-grid>
    </div>

  </div>

</template>


<script>

  const focusModel = require('vue-focus').focusModel;

  module.exports = {
    directives: { focusModel },
    props: {
      searchtoggled: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      searchterm: '',
      currentpage: 1,
      typing: false,
      lastsearch: 'oblivion it is',
      focused: false,
    }),
    created() {
      // Preseed the searchterm with a value stored in the Vuex store.
      this.searchterm = this.searchParams;
    },
    computed: {
      prompttext() {
        if (this.searchTopics.length > 0 || this.searchContents.length > 0) {
          return 'Search results:';
        } else if (this.searchterm.length > 0 && this.searchTopics.length === 0
          && this.searchContents.length === 0 && !this.searchLoading) {
          return 'Could not find any matches.';
        }
        if (this.searchterm.length === 0) {
          this.searchReset();
        }
        return '';
      },
    },
    methods: {
      clearThenClose() {
        if (this.searchterm.length > 0) {
          return false;
        }
        this.searchtoggled = false;
        return true;
      },
      reFocus() {
        this.searchterm = '';
        this.focused = true;
      },
      toggleSearch() {
        this.searchtoggled = !this.searchtoggled;
      },
      searchContent(page) {
        if (this.searchterm.length > 0 && !this.searchLoading) {
          this.lastsearch = this.searchterm;
          this.currentpage = page;
          this.showSearchResults(this.searchterm, page);
        }
        this.typing = false;
      },
      isTyping() {
        if (this.lastsearch !== this.searchterm) {
          this.typing = true;
        } else {
          this.typing = false;
        }
      },
      increasePage() {
        this.currentpage += 1;
      },
      decreasePage() {
        this.currentpage -= 1;
      },
      nextPage() {
        if (this.currentpage !== this.pageCount) {
          this.increasePage();
          this.showSearchResults(this.searchterm, this.currentpage);
        }
      },
      prePage() {
        if (this.currentpage !== 1) {
          this.decreasePage();
          this.showSearchResults(this.searchterm, this.currentpage);
        }
      },
    },
    components: {
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
      'card-grid': require('../card-grid'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        searchContents: state => state.searchState.contents || [],
        searchTopics: state => state.searchState.topics || [],
        pageCount: state => state.searchState.pageCount,
        searchLoading: state => state.searchLoading,
        searchParams: state => state.searchState.params || '',
      },
      actions: require('../../actions'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .search-in-progress
    opacity: 0.5

</style>
