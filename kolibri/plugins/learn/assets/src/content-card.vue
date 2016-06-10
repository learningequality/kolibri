<template>
  <a :href="#">
    <div class="content-card-container">
      <img :src="content.thumbnail" class="thumbnail"/>
      <div class="title">
        {{ content.title }}
      </div>
    </div>
  </a>
</template>


<script>

  module.exports = {
    props: ['content'],
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .content-card
    height: 150px
    width: 200px

  .thumbnail
    width: 200px
    height: 120px

  .title
    max-width: 200px

</style>
