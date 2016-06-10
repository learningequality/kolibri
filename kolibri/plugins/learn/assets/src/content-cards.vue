<template>
  Contents Here
  <ul class="content-card-list">
    <li v-for="content in contentcards">
      <content-card
        :title="content.title"
        :thumbsrc="content.thumbnail"
        >
      </content-card>
    </li>
  </ul>
</template>


<script>

  module.exports = {
    props: ['contentcards'],
    components: {
      'content-card': require('./content-card'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .content-card-list
    display: inline
    list-style: none

</style>
