<template>

  <card-grid header="Content" v-if="contents.length">
    <content-card
      v-for="content in contents"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :progress="content.progress"
      :id="content.id">
    </content-card>
  </card-grid>

</template>


<script>

  module.exports = {
    components: {
      'content-card': require('../content-card'),
      'card-grid': require('../card-grid'),
    },
    vuex: {
      getters: {
        contents: state => state.pageState.contents,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
