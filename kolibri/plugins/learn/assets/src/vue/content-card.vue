<template>

  <a :href="linkhref">
    <div class="content-card-container">
      <div class="content-icon">
        <img src="./content-icons/video.svg">
      </div>
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
    width: 13.2rem
    height: 11rem
    background-color: $core-bg-light
    border-radius: 4px
    position: relative

  .content-icon
    position: absolute
    height: 30px
    width: 30px
    top: 0.35rem
    left: 0.35rem

  .thumbnail
    width: 13.2rem
    height: 7.6rem
    border-radius: 4px 4px 0 0

  .title
    max-width: 13.2rem
    max-height: 3rem
    margin: 0.4rem
    overflow: hidden
    line-height: 1.5rem
    font-size: 0.9rem
    font-weight: 700
    color: $core-text-default

</style>
