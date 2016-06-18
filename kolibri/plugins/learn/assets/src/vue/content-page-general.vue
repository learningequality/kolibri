<template>

  <div>
    <viewerslot kind="" url="">
      <div class="obama"></div>
    </viewerslot>
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
      'content-card': require('./content-card'),
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
