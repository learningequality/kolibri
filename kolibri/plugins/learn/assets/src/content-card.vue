<template>
  <a :href="content.link-href">
    <div class="content-card-container">
      <img :src="content.thumbnail"/>
      {{ content.title }}
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

  .content-card-container
    height: 150px
    width: 200px
    border: 1px

</style>
