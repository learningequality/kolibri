<template>

  <div>
    <h1>{{ title }}</h1>
    <div class="card-list">
      <content-card
        v-for="content in block"
        class="card"
        linkhref="#"
        :title="content.title"
        :thumbsrc="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress">
      </content-card>
    </div>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'content-card': require('../../vue/content-card'),
    },
    props: ['titleid', 'block'],
    computed: {
      title() {
        switch (this.titleid) {
          case 'next':
            return 'Next';
          case 'popular':
            return 'Popular';
          case 'review':
            return 'Review';
          default:
            return 'unknown';
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
