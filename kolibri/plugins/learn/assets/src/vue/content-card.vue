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
    width: 13.6em
    height: 11em
    background-color: $core-bg-light
    border-radius: 4px

  .thumbnail
    width: 13.6em
    height: 7.6em
    border-radius: 4px 4px 0 0

  .title
    max-width: 13.6em
    max-height: 3em
    margin: 0.4em
    overflow: hidden
    line-height: 1.5em
    font-size: 0.9em
    color: $core-text-default

</style>
