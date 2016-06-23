<template>

  <a :href="linkhref">
      <img v-if="thumbsrc" :src="thumbsrc">
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

  a
    column(1/4, cycle:4, gutter:1)
    // height: 10em
    box-sizing: border-box
    padding: 1rem
    background-color: $core-bg-light
    margin-bottom: 1rem

  img
    column(1)

</style>
