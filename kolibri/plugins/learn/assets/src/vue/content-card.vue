<template>

  <a href="linkhref">
    <div class="content-card-container">
      <img :src="thumbsrc" class="thumbnail">
      <div class="title">
        {{ title }}
      </div>
    </div>
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

  .content-card-container
    width: 14em
    height: 12em
    background-color: $core-bg-light
    text-align: left
    border-radius: 4px

  .thumbnail
    width: 13.5em
    height: 120px
    border-radius: 4px 4px 0 0

  .title
    max-width: 14em
    max-height: 3em
    margin: 0.4em 0.5em
    overflow: hidden
    line-height: 1.5em
    font-size: 1em
    color: $core-text-default

</style>
