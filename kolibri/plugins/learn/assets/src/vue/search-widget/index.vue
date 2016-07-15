<template>

  <div>
    <form class="searchform" v-on:submit.prevent>
      <div>
        <label @click="toggleSearch()" for="search">
          <img alt="search" class="btn-search-img" src="./images/search.svg">
        </label>
        <input v-show="searchtoggled" transition="fast" v-focus-model="focused" type="search" v-model="searchterm" name="search" autocomplete="off" placeholder="Find content..." @keydown="isTyping()" @keyup="searchContent(1) | debounce 500" id="search" class="search-input" :class=" {'search-input-active' : searchtoggled }">
        <button v-show="searchtoggled && searchterm" class="close-icon" type="reset" @click="reFocus()"></button>
      </div>
    </form>

    <h4 v-show="searchtoggled && searchterm" v-bind:class="{ 'hideme': typing || searchLoading }" id="search-result" transition="fade">{{ prompttext }}</h4>
    <div v-show="searchtoggled && searchterm" class="card-list" transition="fade" v-bind:class="{ 'search-in-progress': typing || searchLoading }">
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

    <div v-show="searchtoggled && searchterm" class="pagination-wrapper" transition="fade">
      <ul v-if="pagesCount > 1" class="pagination">
        <li @click="prePage" class="page-btn" v-bind:class="{ 'disabled': currentpage === 1 }">«</li>

        <!-- when there are less or equal than 5 pages, use this layout -->
        <li
          class="page-btn"
          v-if="pageCount <= 5"
          v-for="page in pageCount"
          v-bind:class="{ 'selected': currentpage === page + 1 }"
          @click="searchContent(page + 1)"
        >{{ page + 1 }}</li>

        <!-- when there are more than 5 pages, use this very complicated layout -->
        <!-- always show the first page btn -->
        <li
          class="page-btn"
          v-if="pageCount > 5"
          v-bind:class="{ 'selected': currentpage === 1 }"
          @click="searchContent(1)"
        >{{ 1 }}</li>

        <li
          class="page-btn disabled"
          v-if="pageCount > 5 && currentpage >= 5"
        > ... </li>
        <li
          class="page-btn"
          v-if="pageCount > 5 && currentpage <5"
          v-for="page in 4"
          v-bind:class="{ 'selected': currentpage === page + 2 }"
          @click="searchContent(page + 2)"
        >{{ page + 2 }}</li>
        <li
          class="page-btn"
          v-if="pageCount > 5 && currentpage >=5 && currentpage < pageCount - 3"
          v-for="page in 3"
          v-bind:class="{ 'selected': currentpage === currentpage + page - 1 }"
          @click="searchContent(currentpage + page - 1)"
        >{{ currentpage + page - 1 }}</li>
        <!-- when reach the last 4 pages -->
        <li
          class="page-btn"
          v-if="pageCount > 5 && currentpage > pageCount - 4 && currentpage <= pageCount"
          v-for="page in 4"
          v-bind:class="{ 'selected': currentpage === pageCount - 4 + page }"
          @click="searchContent(pageCount - 4 + page)"
        >{{ pageCount - 4 + page }}</li>

        <li
          class="page-btn disabled"
          v-if="pageCount > 5 && currentpage < pageCount - 3"
        > ... </li>

        <!-- always show the last page btn -->
        <li
          class="page-btn"
          v-if="pageCount > 5"
          v-bind:class="{ 'selected': currentpage === pageCount }"
          @click="searchContent(pageCount)"
        >{{ pageCount }}</li>

        <li @click="nextPage" class="page-btn"  v-bind:class="{ 'disabled': currentpage === pageCount }">»</li>
      </ul>
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
          return 'Search result';
        } else if (this.searchterm.length > 0 && this.searchTopics.length === 0
          && this.searchContents.length === 0 && !this.searchLoading) {
          return 'Could not find anything matched';
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

// search input box
  .search-input
    outline: none
    width: 0
    background-color: $core-bg-canvas
    border-radius: 40px
    max-width: 500px
    min-width: 300px
    width: 80%
    height:30px
    border: 2px solid #cccccc
    pointer-events: auto
    padding: 0 1em
  .search-input-active
    display: inline-block
    padding: 0 40px
    max-width: 600px
    min-width: 300px
    height:30px
    border: 1px solid rgba(58, 58, 58, 1)
    pointer-events: auto

  .btn-search-img
    float: right

  .close-icon
    border:1px solid transparent
    background-color: transparent
    display: inline-block
    vertical-align: middle
    outline: none
    cursor: pointer
    right: 35px
    position: relative
    padding: 4px
  .close-icon:after
    content: 'X'
    display: block
    width: 15px
    height: 15px
    position: absolute
    background-color: $core-text-annotation
    z-index:1
    top: -8px
    bottom: none
    margin: auto
    padding: 3px
    border-radius: 50%
    text-align: center
    color: white
    font-weight: normal
    font-size: 12px
    cursor: pointer

  .fade-transition
    transition: all 0.3s ease-out
  .fade-enter
    opacity: 0
  .fade-leave
    opacity: 0
  .hideme
    opacity: 0
  .search-in-progress
    opacity: 0.5

  .fast-transition
    transition: all 0.3s ease-out
  .fast-enter
    opacity: 0
    transform: translateX(50%)
  .fast-leave
    opacity: 0
    transform: translateX(100%)

// paginationm
  .pagination-container
    width: 100%
    height: 60px
    background-color: $core-bg-canvas
    position: absolute
    bottom: 0
    text-align: center
  .pagination
    padding: 0 12px
    display: table
    width: 100%
    border-spacing: 4px
  .pre-btn
    float: left
  .last-btn
    float: right
    margin-right: 20px
  .page-btn
    width: 30px
    height: 30px
    color: $core-text-default
    background-color: $core-bg-light
    border-radius: 4px
    user-select: none
    cursor: pointer
    display: inline-block
  .page-btn:hover
    background-color: $core-action-light
  .selected
    pointer-events: none
    cursor: default
    color: $core-bg-light
    background-color: $core-action-normal
  .disabled
    pointer-events: none
    cursor: default
    opacity: 0.5

  .pagination-wrapper
    position: fixed
    bottom: 10px
    left: 50%
    transform: translateX(-50%)

</style>
