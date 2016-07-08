<template>

  <form class="searchform" v-on:submit.prevent>
    <label @click="toggleSearch()" class="btn-search" :class=" {'btn-search-left' : search_toggled } " for="search">
      <span class="btn-search-img">search</span>
    </label>
    <input id="searchbox" type="search" v-model="searchterm" name="search" autocomplete="off" placeholder="Find content..." @keydown="isTyping()" @keyup="searchContent(1) | debounce 500" id="search" class="search-input" :class=" {'search-input-active' : search_toggled }">
    <button v-show="search_toggled && searchterm" class="close-icon" type="reset" @click="reFocus()"></button>
  </form>

  <h4 v-show="search_toggled && searchterm" v-bind:class="{ 'hideme': typing || !search_finished }" id="search-result" transition="fade">{{ prompttext }}</h4>
  <div v-show="search_toggled && searchterm" class="card-list" transition="fade" v-bind:class="{ 'search-in-progress': typing || !search_finished }">
    <div v-if="search_topics.length > 0">
      <topic-card
        v-for="topic in search_topics"
        class="card"
        :id="topic.pk"
        :title="topic.title"
        :ntotal="topic.n_total"
        :ncomplete="topic.n_complete">
      </topic-card>
    </div>

    <div v-if="search_contents.length > 0">
      <content-card
        v-for="content in search_contents"
        class="card"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :id="content.pk">
      </content-card>
    </div>
  </div>

  <div v-show="search_toggled && searchterm" class="pagination-wrapper" transition="fade">
    <ul v-if="pages_sum > 1" class="pagination">
      <li @click="prePage" class="page-btn" v-bind:class="{ 'disabled': currentpage === 1 }">«</li>

      <!-- when there are less or equal than 5 pages, use this layout -->
      <li 
        class="page-btn"
        v-if="pages_sum <= 5"
        v-for="page in pages_sum"
        v-bind:class="{ 'selected': currentpage === page + 1 }"
        @click="searchContent(page + 1)"
      >{{ page + 1 }}</li>

      <!-- when there are more than 5 pages, use this very complicated layout -->
      <!-- always show the first page btn -->
      <li 
        class="page-btn"
        v-if="pages_sum > 5"
        v-bind:class="{ 'selected': currentpage === 1 }"
        @click="searchContent(1)"
      >{{ 1 }}</li>

      <li 
        class="page-btn disabled"
        v-if="pages_sum > 5 && currentpage >= 5"
      > ... </li>
      <li 
        class="page-btn"
        v-if="pages_sum > 5 && currentpage <5"
        v-for="page in 4"
        v-bind:class="{ 'selected': currentpage === page + 2 }"
        @click="searchContent(page + 2)"
      >{{ page + 2 }}</li>
      <li 
        class="page-btn"
        v-if="pages_sum > 5 && currentpage >=5 && currentpage < pages_sum - 3"
        v-for="page in 3"
        v-bind:class="{ 'selected': currentpage === currentpage + page - 1 }"
        @click="searchContent(currentpage + page - 1)"
      >{{ currentpage + page - 1 }}</li>
      <!-- when reach the last 4 pages -->
      <li 
        class="page-btn"
        v-if="pages_sum > 5 && currentpage > pages_sum - 4 && currentpage <= pages_sum"
        v-for="page in 4"
        v-bind:class="{ 'selected': currentpage === pages_sum - 4 + page }"
        @click="searchContent(pages_sum - 4 + page)"
      >{{ pages_sum - 4 + page }}</li>

      <li 
        class="page-btn disabled"
        v-if="pages_sum > 5 && currentpage < pages_sum - 3"
      > ... </li>

      <!-- always show the last page btn -->
      <li 
        class="page-btn"
        v-if="pages_sum > 5"
        v-bind:class="{ 'selected': currentpage === pages_sum }"
        @click="searchContent(pages_sum)"
      >{{ pages_sum }}</li>

      <li @click="nextPage" class="page-btn"  v-bind:class="{ 'disabled': currentpage === pages_sum }">»</li>
    </ul>
  </div>

</template>


<script>

  module.exports = {
    data: () => ({
      searchterm: '',
      currentpage: 1,
      typing: false,
      lastsearch: 'oblivion it is',
    }),
    computed: {
      prompttext() {
        if (this.search_topics.length > 0 || this.search_contents.length > 0) {
          return 'Search result';
        } else if (this.searchterm.length > 0 && this.search_topics.length === 0
          && this.search_contents.length === 0 && this.search_finished) {
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
        document.getElementById('searchbox').focus();
      },
      toggleSearch() {
        document.getElementById('searchbox').focus();
        if (this.search_toggled) {
          this.searchToggleSwitch(false);
        } else {
          this.searchToggleSwitch(true);
        }
      },
      searchContent(page) {
        if (this.searchterm.length > 0) {
          this.searchReset();
          this.lastsearch = this.searchterm;
          this.currentpage = page;
          this.searchNodes(this.searchterm, page);
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
        this.searchNodes(this.searchterm, this.currentpage);
      },
      prePage() {
        this.decreasePage();
        this.searchNodes(this.searchterm, this.currentpage);
      },
    },
    components: {
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        search_contents: state => state.searchcontents,
        search_topics: state => state.searchtopics,
        search_toggled: state => state.searchtoggled,
        pages_sum: state => state.searchpages,
        search_finished: state => state.searchfinished,
      },
      actions: require('../../actions'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  .search-input
    outline: none
    position: relative
    display: inline-block
    width:0
    background-color: $core-bg-canvas
    border-radius: 40px
    border: 1px solid rgba(58, 58, 58, 0.1)
    border:none
    pointer-events: none
    transition: width 0.2s ease-out
    -webkit-backface-visibility: hidden
    -webkit-transform: translate3d(0, 0, 0)
  .search-input-active
    display: inline-block
    padding: 0 40px
    width: 70%
    max-width: 600px
    min-width: 300px
    height:30px
    border: 1px solid rgba(58, 58, 58, 1)
    pointer-events: auto
  .btn-search-left
    left: 40px
  .btn-search
    position: relative
    display: inline-block
    height: 30px
    width: 30px
    background:none
    border: none
    text-indent: -10000px
    cursor: pointer
    z-index: 1
  .btn-search-img
    display: block
    background: url('./search.svg') no-repeat right
      
  .close-icon
    border:1px solid transparent
    background-color: transparent
    display: inline-block
    vertical-align: middle
    outline: none
    cursor: pointer
    right: 35px
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
  .close-icon
    position: relative
    padding: 4px

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
  .page-btn
    display: inline-block
    width: 30px
    height: 30px
    color: $core-text-default
    background-color: $core-bg-light
    border-radius: 4px
    user-select: none
    cursor: pointer
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
