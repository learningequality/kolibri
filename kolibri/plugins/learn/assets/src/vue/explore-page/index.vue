<template>

  <div class="temp-nav">
  </div>
  <search-widget></search-widget>
  <div class="page">
    <div class="page-container">
      <div class="tool-bar-container">
        <label v-show="!search_toggled" @click="searchToggleSwitch(true)" class="btn-search" for="search">
          <span class="btn-search-img">search</span>
        </label>
        <div v-show="!search_toggled" class="breadcrumbs-container" transition="fast">
          <breadcrumbs v-if="breadcrumbs"></breadcrumbs>
        </div>
        <div class="tool-bar" :class="{ 'tool-bar-center' : search_toggled }" >
          <select v-show="!search_toggled" class="btn-channel" transition="fast">
            <option value="khan">Khan Academy</option>
            <option value="ck12">CK-12</option>
          </select>
        </div>
      </div>

      <div class="card-section" transition="fast">
        <card-grid header="Topics" v-if="topics.length">
          <topic-card
            v-for="topic in topics"
            :id="topic.pk"
            :title="topic.title"
            :ntotal="topic.n_total"
            :ncomplete="topic.n_complete">
          </topic-card>
        </card-grid>

        <card-grid header="Content" v-if="contents.length">
          <content-card
            v-for="content in contents"
            class="card"
            :title="content.title"
            :thumbnail="content.thumbnail"
            :kind="content.kind"
            :progress="content.progress"
            :id="content.pk">
          </content-card>

        </card-grid>
      </div>
    </div>
  </div>

</template>


<script>

  module.exports = {
    created() {
      this.fetchNodes(this.id);
    },
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
      'search-widget': require('../search-widget'),
      'card-grid': require('../card-grid'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        topics: state => state.topics,
        contents: state => state.contents,
        // from URL
        id: state => state.route.params.content_id,
        search_toggled: state => state.searchtoggled,
      },
      actions: require('../../actions'),
    },
    watch: {
      id(value) {
        this.fetchNodes(value);
      },
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
    
  .btn-search
    position: relative
    float: right
    display: inline-block
    height: 30px
    width: 30px
    background:none
    border: none
    text-indent: -10000px
    cursor: pointer
  .btn-search-img
    display: block
    background: url('../search-widget/search.svg') no-repeat right

</style>
