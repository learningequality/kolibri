<template>

  <div>
    <h2>"Learn" Content</h2>
    <content-render kind="audio" extension="mp3">
    </content-render>
    <h3>
      {{ title }}
    </h3>
    <p>
      {{ description }}
    </p>
    <div class="rec-grid card-list">
      <content-card
        v-for="content in recommended"
        class="card"
        linkhref="#"
        :title="content.title"
        :thumbsrc="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress">
      </content-card>
    </div>
    <content-render kind="video" extension="mp4"></content-render>
  </div>

</template>


<script>

  module.exports = {
    props: [
      'title',
      'description',
      'recommended',
    ],
    components: {
      'content-render': require('content-renderer'),
      'content-card': require('./content-card'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        title: (state) => state.full.title,
        description: (state) => state.full.description,
        recommended: (state) => state.full.recommended,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .rec-grid content-card img
    max-width: 250px
    max-height: 250px
    margin: 0 15px 0 0

  .rec-grid
    display: inline-block

  .obama
    background: pink
    width: 80%
    height: 400px
    text-align: center

</style>
