<template>

  <div v-if="searchtoggled">
    <div class="searchbar">
      <span
        @click="toggleSearch()"
        class="close-search">
        close
      </span>

      <form class="searchform" v-on:submit.prevent>
        <input v-focus-model="focused" type="search" v-model="searchterm" name="search" autocomplete="off" placeholder="Find content..." @keydown="isTyping()" @keyup="searchContent(1) | debounce 500" id="search" class="search-input">
        <img
          class="reset-img"
          v-show="searchterm"
          @click="reFocus()"
          src="./trash.svg">
      </form>
    </div>

    <h6 v-if=" prompttext && (typing || searchLoading)" transition="fade">{{ prompttext }}</h6>

    <section v-if="searchterm" v-if="searchTopics.length || searchContents.length" class="results">
      <card-grid header="Topics" v-bind:class="{ 'search-in-progress': typing || searchLoading }">
        <topic-card
          v-for="topic in searchTopics"
          :title="topic.title"
          :description="topic.description"
          :kind="topic.kind"
          :id="topic.id">
        </topic-card>
      </card-grid>

      <card-grid header="Content">
        <content-card
          v-for="content in searchContents"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :description="content.description"
          :kind="content.kind"
          :progress="content.progress"
          :id="content.id">
        </content-card>
      </card-grid>

    <div class="pagination-container" transition="fade">
      <ul class="pagination">
        <li @click="prePage" class="page-btn pre-btn" v-bind:class="{ 'disabled': currentpage === 1 ||  !searchterm }">«</li>

        <!-- when there are less or equal than 5 pages, use this layout -->
        <li
          class="page-btn"
          v-show="searchterm"
          v-if="pageCount <= 5 && pageCount > 1"
          v-for="page in pageCount"
          v-bind:class="{ 'selected': currentpage === page + 1 }"
          @click="searchContent(page + 1)"
        >{{ page + 1 }}</li>

        <!-- when there are more than 5 pages, use this very complicated layout -->
        <!-- always show the first page btn -->
        <li
          class="page-btn"
          v-show="searchterm"
          v-if="pageCount > 5"
          v-bind:class="{ 'selected': currentpage === 1 }"
          @click="searchContent(1)"
        >{{ 1 }}</li>

        <li
          class="page-btn disabled"
          v-show="searchterm"
          v-if="pageCount > 5 && currentpage >= 5"
        > ... </li>
        <li
          class="page-btn"
          v-show="searchterm"
          v-if="pageCount > 5 && currentpage <5"
          v-for="page in 4"
          v-bind:class="{ 'selected': currentpage === page + 2 }"
          @click="searchContent(page + 2)"
        >{{ page + 2 }}</li>
        <li
          class="page-btn"
          v-show="searchterm"
          v-if="pageCount > 5 && currentpage >=5 && currentpage < pageCount - 3"
          v-for="page in 3"
          v-bind:class="{ 'selected': currentpage === currentpage + page - 1 }"
          @click="searchContent(currentpage + page - 1)"
        >{{ currentpage + page - 1 }}</li>
        <!-- when reach the last 4 pages -->
        <li
          class="page-btn"
          v-show="searchterm"
          v-if="pageCount > 5 && currentpage > pageCount - 4 && currentpage <= pageCount"
          v-for="page in 4"
          v-bind:class="{ 'selected': currentpage === pageCount - 4 + page }"
          @click="searchContent(pageCount - 4 + page)"
        >{{ pageCount - 4 + page }}</li>

        <li
          class="page-btn disabled"
          v-show="searchterm"
          v-if="pageCount > 5 && currentpage < pageCount - 3"
        > ... </li>

        <!-- always show the last page btn -->
        <li
          class="page-btn"
          v-show="searchterm"
          v-if="pageCount > 5"
          v-bind:class="{ 'selected': currentpage === pageCount }"
          @click="searchContent(pageCount)"
        >{{ pageCount }}</li>

        <li @click="nextPage" class="page-btn last-btn"  v-bind:class="{ 'disabled': currentpage === pageCount ||  !searchterm }">»</li>
      </ul>
    </div>

    </section>
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
        this.increasePage();
        this.showSearchResults(this.searchterm, this.currentpage);
      },
      prePage() {
        this.decreasePage();
        this.showSearchResults(this.searchterm, this.currentpage);
      },
    },
    components: {
      'card-grid': require('../card-grid'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
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

// search area
  .searchbar
  .searchform
    width: 100%
    text-align: center
    input
      width: 80%

  .close-search
    color: gray
    content: ''
    background-image: url('./close.svg')

// paginationm
  .pagination-container
    width: 100%
    height: 60px
    background-color: $core-bg-canvas
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
    display: table-cell
    vertical-align: middle
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

// Transitions
  .glide-transition
    transition: all 0.3s ease-out
  .glide-enter, .glide-leave
    transform: translateX(100%)
  .fade-transition
    transition: all 0.3s ease-out
  .fade-enter, .fade-leave
    opacity: 0
  .hideme
    opacity: 0
  .search-in-progress
    opacity: 0.5

/* // scrollbar
::-webkit-scrollbar
  width: 22px
  margin-right: 20px
  margin-left: 20px
::-webkit-scrollbar-track
  background: #cccccc
  -webkit-border-radius: 14px
  border-radius: 14px
  margin-top: 3px
  margin-bottom: 3px
  border: 6px solid transparent
  background-clip: padding-box
::-webkit-scrollbar-thumb
  -webkit-border-radius: 14px
  border-radius: 14px
  border: 7px solid transparent
  background: #ffffff
  background-clip: padding-box*/

</style>
