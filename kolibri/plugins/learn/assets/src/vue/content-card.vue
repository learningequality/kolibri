<template>

  <a :href="linkhref">
      <!-- Will be looking into adding this later -->
      <img class="content-icon" v-if="kind" src="./content-icons/video.svg">
      <img class="thumbnail" v-if="thumbsrc" :src="thumbsrc">
      <h4>
        {{ title }}
      </h4>
  </a>

</template>


<script>

  module.exports = {
    props: [
      'title',
      'thumbsrc',
      'linkhref',
      'kind',
      'progress',
    ],
  };

</script>


<style lang="stylus" scoped>

  @import 'jeet'
  @require '~core-theme.styl'

  $card-border-radius: 5px

  a
    column(1/4, cycle:4, gutter:1)
    // height: 10em
    box-sizing: border-box
    // padding: 1rem
    background-color: $core-bg-light
    margin-bottom: 1rem
    border-radius: $card-border-radius

  .thumbnail
    column(1)
    border-radius: $card-border-radius

  .content-icon
    column(1/10)
    position: relative
    top: 1.6em
    left: 0.5em
    margin-top: -1em
    margin-bottom: -1em

</style>
