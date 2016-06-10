<template>
  Contents Here
  <ul class="content-card-list">
    <li v-for="content in contentcards">
      <a :href="content.link-href">
        <div class="content-card-container">
          <img :src="content.thumbnail"/>
          {{ content.title }}
        </div>
      </a>
    </li>
  </ul>
</template>


<script>

  module.exports = {
    props: ['contentcards'],
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .content-card-list
    display: inline
    list-style: none

  .content-card-container
    height: 150px
    width: 200px
    border: 1px

</style>
