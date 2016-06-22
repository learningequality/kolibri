<template>

  <a href="{{linkhref}}">
    <div class="topic-card-container">
      <div class="thumbnail">
        <div class="topic-card-folder"></div>
      </div>
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
      'linkhref',
      'ntotal',
      'ncomplete',
    ],
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .topic-card-container
    display: block
    width: 210px
    height: 11rem
    border-radius: 4px
    background-color: $core-bg-light

  .thumbnail
    width: 210px
    height: 7.6rem
    text-align: center
    border-radius: 4px 4px 0 0
    background: #E6E6E6  // New Color that we might add to core-theme.styl

  .thumbnail:before
    content: ''
    display: inline-block
    vertical-align: middle
    height: 100%

  .topic-card-folder
    width: 70px
    height: 55px
    vertical-align: middle
    display: inline-block
    background-color: $core-action-normal

  .title
    max-width:210px
    font-size: 0.9rem
    font-weight: 700
    margin: 0.4rem
    color: $core-text-default

</style>
