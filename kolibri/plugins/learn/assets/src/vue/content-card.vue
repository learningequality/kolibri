<template>

  <a :href="linkhref">
      <!-- Will be looking into adding this later -->
      <img class="content-icon" v-if="kind" src="./content-icons/video.svg">
      <img class="thumbnail" v-if="thumbsrc" :src="thumbsrc">
      <h3>
        {{ title }}
      </h3>
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

  @require '~core-theme.styl'

  $card-border-radius: 5px

  h4
    padding-left: 1rem
    padding-right: 1rem

  a
    box-sizing: border-box
    background-color: $core-bg-light
    margin-bottom: 1rem

  .thumbnail
    width: 100%

  .content-icon
    position: relative
    top: 1.6em
    left: 0.5em
    margin-top: -1em
    margin-bottom: -1em

</style>
