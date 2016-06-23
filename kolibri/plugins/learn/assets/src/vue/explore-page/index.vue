<template>

  <div class="temp-nav">
  </div>

  <div class="explore-page">
    <div class="explore-page-container">
      <div class="learn-tool-bar">
        <div class="breadcrumbs-container">
          <breadcrumbs :crumbs="breadcrumbs.crumbs" :current="breadcrumbs.current"></breadcrumbs>
        </div>
        <div class="learn-tool-bar-container">
          <select class="btn-channel">
            <option value="khan">Khan Academy</option>
            <option value="ck12">CK-12</option>
          </select>
          <button class="btn-search">
            <span class="btn-search-img">search</span>
          </button>
        </div>
      </div>

      <div class="card-list-container">
        <h1 class="section-title">Topics</h1>
        <div class="card-list">
          <topic-card
            v-for="topic in topics"
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

</template>


<script>

  module.exports = {
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        breadcrumbs: state => state.breadcrumbs,
        topics: state => state.topics,
        contents: state => state.contents,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .section-title
    margin-top: 5vh
    font-size: 1.2em
    font-weight: 700

  .temp-nav
    width: 80px
    height: 100%
    position: fixed
    background-color: $core-bg-light

  .learn-tool-bar
    height: 30px
    padding-top: 30

    .breadcrumbs-container
      float: left
      position: relative
      line-height: 30px
      display: inline-block

    .learn-tool-bar-container
      float: right
      opacity: 0.6
      display: inline-flex

      select.btn-channel
        border: 1px solid $core-text-default
        border-radius: 50px
        padding: 0.2em 0.8em
        -webkit-appearance: none
        width: 100%
        background: url('./arrow-down.svg') no-repeat right

      .btn-search
        height: 30px
        width: 60px
        display: block
        text-indent: -10000px
        margin-left: 20
        border: none
        background:none
        cursor: pointer

        .btn-search-img
          display: block
          background: url('./search.svg') no-repeat right

  .card-list-container
    max-width: (200*3) + 24*3
    margin-right: -24px

  .card-list
    margin: auto

  .card-list .card
    margin: 0 24 24 0

  .explore-page
    margin-left: 80px

  .explore-page-container
    max-width: (200*3) + 24*2
    margin:auto

  @media screen and (min-width: 1060px)
    .explore-page-container
      max-width: (200*4) + 24*3
    .card-list-container
      max-width: (200*4) + 24*4

  @media screen and (min-width: 1280px)
    .explore-page-container
      max-width: (200*5) + 24*4
    .card-list-container
      max-width: (200*5) + 24*5

  @media screen and (min-width: 1680px)
    .explore-page-container
      max-width: (200*6) + 24*5
    .card-list-container
      max-width: (200*6) + 24*6

</style>
