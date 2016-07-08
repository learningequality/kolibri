<template>

  <form class="searchform" v-on:submit.prevent>
    <label @click="searchToggleSwitch(true)" class="btn-search" :class=" {'btn-search-left' : search_toggled } " for="search">
      <span class="btn-search-img">search</span>
    </label>
    <input type="search" v-model="searchterm" name="search" autocomplete="off" placeholder="Find content..." @keyup="searchContent(1) | debounce 500" id="search" class="search-input" :class=" {'search-input-active' : search_toggled }" >
    <button v-show="search_toggled" @click="searchToggleSwitch(false)" class="close"><span class="btn-close-img">close</span></button>
  </form>

  <h4 v-show="search_toggled" id="search-result" transition="fade-right">{{ prompttext }}</h4>
  <div v-show="search_toggled" class="card-list" transition="fade-right">
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
        :thumbnail="content.files[0].storage_url"
        :kind="content.kind">
      </content-card>
    </div>
  </div>

  <div v-show="search_toggled" class="pagination-wrapper" transition="fade-right">
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
    }),
    computed: {
      prompttext() {
        if (this.search_topics.length > 0 || this.search_contents.length > 0) {
          return 'Search results';
        } else if (this.searchterm.length > 0 && this.search_topics.length === 0
          && this.search_contents.length === 0) {
          return 'No matched results';
        }
        return '';
      },
    },
    methods: {
      searchContent(page) {
        if (this.searchterm.length > 0) {
          this.currentpage = page;
          this.searchNodes(this.searchterm, page);
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
      },
      actions: require('../../actions'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  $thumbnail-width = 200
  $margin-width = 24
  card-list-container-width(n-cols)
    width: ($thumbnail-width * n-cols) + ($margin-width * n-cols)
  card-list-container-max-width(n-cols)
    max-width: ($thumbnail-width * n-cols) + ($margin-width * n-cols)
  input-width(n-cols)
    width: $thumbnail-width * (n-cols - 1)
  media-query(n-cols)
    .page-container
      max-width: ($thumbnail-width * n-cols) + $margin-width * (n-cols - 1)
    .card-list-container
      max-width: ($thumbnail-width * n-cols) + $margin-width * n-cols
    .tool-bar-container
      width: ($thumbnail-width * n-cols) + $margin-width * (n-cols - 1)
    .tool-bar-container .search-input-active
      width: $thumbnail-width * (n-cols) * 0.7
    .tool-bar-container .tool-bar-center
      -webkit-transform: translateX(-(((($thumbnail-width * n-cols) + $margin-width * (n-cols - 1)) - ($thumbnail-width * (n-cols) * 0.7))/2)px)
  .section-title
    margin-top: 5vh
    font-size: 1.2em
    font-weight: 700
  .tool-bar-container
    position: fixed
    top: 0
    card-list-container-width(1)
    height: 30px
    padding: 30 0
    background-color: $core-bg-canvas
    text-align: center
    z-index: 1
    .breadcrumbs-container
      position: absolute
      left:0
      display: inline-block
      line-height: 30px
      z-index: -1000
    .tool-bar
      float: right
      display: inline-block
      opacity: 0.6
      transition: all 0.3s ease-out
    .tool-bar-center
      height: 30px
      text-align: center
    .tool-bar-center .btn-search
      pointer-events: none
      top: 0
    select.btn-channel
      display: inline-block
      position: absolute
      right: 50px
      width: 160px
      padding: 0.2em 0.8em
      background: url('./arrow-down.svg') no-repeat right
      border: 1px solid $core-text-default
      border-radius: 50px
      -webkit-appearance: none
    .searchform
      display: inline-block
      z-index: 1
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
      input-width(1)
      display: inline-block
      padding: 0 40px
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
      top: 4
      .btn-search-img
        display: block
        background: url('./search.svg') no-repeat right
  .close
    outline: none
    position: relative
    display: inline-block
    right: 40px
    height: 30px
    width: 30px
    background:none
    border: none
    text-indent: -10000px
    cursor: pointer
    z-index: 1
    .btn-close-img
      display: block
      background: url('./close.svg') no-repeat center
  .card-section
    position: relative
    top: 60px
  .card-list-container
    card-list-container-max-width(3)
    margin-right: -($margin-width)
  .card-list
    margin: auto
  .card-list .card
    margin: 0 $margin-width $margin-width 0
  .page
    margin-left: 80px
  .page-container
    max-width: (200*3) + 24*2
    margin:auto
  .fast-transition
    transition: all 0.3s ease-out
  .fast-enter
    opacity: 0
    transform: translateX(-50%)
  .fast-leave
    opacity: 0
    transform: translateX(-100%)
    
  .fade-right-transition
    transition: all 0.3s ease-out
  .fade-right-enter
    opacity: 0
    transform: translateX(50%)
  .fade-right-leave
    opacity: 0
    transform: translateX(100%)
  @media screen and (min-width: 570px)
    media-query(2)
  @media screen and (min-width: 810px)
    media-query(3)
  @media screen and (min-width: 1060px)
    media-query(4)
  @media screen and (min-width: 1280px)
    media-query(5)
  @media screen and (min-width: 1680px)
    media-query(6)


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

</style>
