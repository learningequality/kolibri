<template>

  <search-widget :searchtoggled.sync="searchToggled"></search-widget>

  <!---------------------- Elements required for sidebar ---------------------->
  <!-- Lots of these class names are not content-oriented or semantically
  significant. Markup needs to reflect content, not styles. Will need to
  refactor this. -->
  <div class="tool-bar-container">

    <label v-show="!searchToggled" @click="searchToggleSwitch(true)" class="btn-search" for="search">
      <span class="btn-search-img">search</span>
    </label>

    <div v-show="!searchToggled" class="breadcrumbs-container" transition="fast">
      <breadcrumbs
        v-if='!isRoot'
        :rootid='rootTopicId'
        :crumbs='topic.breadcrumbs'
        :current='topic.title'>
      </breadcrumbs>
    </div>

    <!-- TODO exapsulate into the search bar vue component -->
    <div class="tool-bar" :class="{ 'tool-bar-center' : searchToggled }" >
      <select v-show="!searchToggled" class="btn-channel" transition="fast">
        <option value="khan">Khan Academy</option>
        <option value="ck12">CK-12</option>
      </select>
    </div>
  </div>
  <!-------------------------- End sidebar elements -------------------------->

  <p v-if='topic.description'>
    {{ topic.description }}
  </p>

  <card-grid :header="isRoot ? 'Topics' : '' " v-if="subtopics.length">
    <topic-card
      v-for="topic in subtopics"
      :id="topic.id"
      :title="topic.title"
      :ntotal="topic.n_total"
      :ncomplete="topic.n_complete">
    </topic-card>
  </card-grid>

  <card-grid :header="isRoot ? 'Content' : '' " v-if="contents.length">
    <content-card
      v-for="content in contents"
      class="card"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :progress="content.progress"
      :id="content.id">
    </content-card>

  </card-grid>

</template>


<script>

  module.exports = {
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
      'search-widget': require('../search-widget'),
      'card-grid': require('../card-grid'),
    },
    data() {
      return {
        searchToggled: false,
      };
    },
    methods: {
      searchToggleSwitch(value) {
        this.searchToggled = value;
      },
    },
    vuex: {
      getters: {
        rootTopicId: state => state.rootTopicId,
        topic: state => state.pageState.topic,
        subtopics: state => state.pageState.subtopics,
        contents: state => state.pageState.contents,
        isRoot: (state) => state.pageState.topic.id === state.rootTopicId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  $thumbnail-width = 200
  $margin-width = 24
  input-width(n-cols)
    width: $thumbnail-width * (n-cols - 1)
  media-query(n-cols)
    .page-container
      max-width: ($thumbnail-width * n-cols) + $margin-width * (n-cols - 1)
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
