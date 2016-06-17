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
    font-size: 16px
    height: 180px
    width: 220px
    background-color: $core-bg-light
    text-align: left
    border-radius: 4px




  .thumbnail
    width: 220px
    height: 120px
    border-radius: 4px 4px 0 0

  .title
    max-width: 220px
    max-height: 44px
    margin: 6
    overflow: hidden
    text-overflow: ellipsis
    color: $core-text-default
    line-height: 22px

</style>
