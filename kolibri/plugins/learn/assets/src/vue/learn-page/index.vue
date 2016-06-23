<template>

  <div class="temp-nav">
  </div>

  <div class="learn-page">
    <div class="learn-page-container">
      <div class="learn-tool-bar-container">
        <div class="learn-tool-bar">
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
        <div v-for="(title, block) in contents">
          <h1 class="section-title">{{ title | capitalize }}</h1>
          <div class="card-list">
            <content-card
              v-for="content in block"
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
      'content-card': require('../content-card'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        contents: state => state.recommended,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .temp-nav
    width: 80px
    height: 100%
    position: fixed
    background-color: $core-bg-light

  .section-title
    margin-top: 5vh
    font-size: 1.2em
    font-weight: 700

  .learn-tool-bar-container
    height: 30px
    padding-top: 30

    .learn-tool-bar
      float: right
      opacity: 0.6
      display: inline-flex

      .btn-channel
        background: url('./arrow-down.svg') no-repeat right

  select.btn-channel
    border: 1px solid $core-text-default
    border-radius: 50px
    padding: 0.2em 0.8em
    -webkit-appearance: none
    width: 100%

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

  .learn-page
    margin-left: 80px

  .learn-page-container
    max-width: (200*3) + 24*2
    margin:auto

  .card-list-container
    max-width: (200*3) + 24*3
    margin-right: -24px

  .card-list
    margin: auto

  .card-list .card
    margin: 0 24 24 0

  @media screen and (min-width: 1060px)
    .learn-page-container
      max-width: (200*4) + 24*3
    .card-list-container
      max-width: (200*4) + 24*4

  @media screen and (min-width: 1280px)
    .learn-page-container
      max-width: (200*5) + 24*4
    .card-list-container
      max-width: (200*5) + 24*5

  @media screen and (min-width: 1680px)
    .learn-page-container
      max-width: (200*6) + 24*5
    .card-list-container
      max-width: (200*6) + 24*6

</style>
