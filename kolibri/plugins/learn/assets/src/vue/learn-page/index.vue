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
          <h1 class="rec-title">{{ title }}</h1>
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

  .rec-title
    margin-top: 30px
    font-size: 1.4em
    font-weight: 100

  .temp-nav
    width: 80px
    height: 100%
    position: fixed
    background-color: $core-bg-light

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
    margin-left: 10%

  .learn-page-container
    max-width: (200*3) + 20*2
    margin:auto

  .card-list-container
    max-width: (200*3) + 20*3
    margin-right: -20px

  .card-list
    margin: auto

  .card-list .card
    margin: 0 20 20 0

  @media screen and (min-width: 1060px)
    .learn-page-container
      max-width: (200*4) + 20*3
    .card-list-container
      max-width: (200*4) + 20*4

  @media screen and (min-width: 1280px)
    .learn-page-container
      max-width: (200*5) + 20*4
    .card-list-container
      max-width: (200*5) + 20*5

</style>
