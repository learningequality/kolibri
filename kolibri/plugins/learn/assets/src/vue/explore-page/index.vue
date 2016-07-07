<template>

  <div class="temp-nav">
  </div>

  <div class="page">
    <div class="page-container">
      <div class="tool-bar-container">
        <div v-show="!search_toggled" class="breadcrumbs-container" transition="fast">
          <breadcrumbs :crumbs="breadcrumbs.crumbs" :current="breadcrumbs.current"></breadcrumbs>
        </div>
        <div class="tool-bar" :class="{ 'tool-bar-center' : search_toggled }" >
          <select v-show="!search_toggled" class="btn-channel" transition="fast">
            <option value="khan">Khan Academy</option>
            <option value="ck12">CK-12</option>
          </select>
        </div>

  <search-widget></search-widget>


      </div>

      <div class="card-section" transition="fast" v-show="!search_toggled">
        <div v-if="topics.length > 0" class="card-list-container">
          <h1 class="section-title">Topics</h1>
          <div class="card-list">
            <topic-card
              v-for="topic in topics"
              v-on:click="fetchNodes(topic.pk)"
              class="card"
              linkhref="#"
              :title="topic.title"
              :ntotal="topic.n_total"
              :ncomplete="topic.n_complete">
            </topic-card>
          </div>
        </div>

        <div class="card-list-container">
          <h1 class="section-title">Content</h1>
          <div class="card-list">
            <content-card
              v-for="content in contents"
              class="card"
              linkhref="#"
              :title="content.title"
              :thumbsrc="content.thumbnail"
              :kind="content.kind"
              :progress="content.progress">
            </content-card>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
      'search-widget': require('../search-widget'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        breadcrumbs: state => state.breadcrumbs,
        topics: state => state.topics,
        contents: state => state.contents,
        search_toggled: state => state.searchtoggled,
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
    .searchform
      display: inline-block
      z-index: 1
    .search-input
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
  .close
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

</style>
