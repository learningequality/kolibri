<template>

  <div class="topic-page">
    <br><br>
    <breadcrumbs :crumbs="breadcrumbs.crumbs" :current="breadcrumbs.current"></breadcrumbs>

    <h2>Topics</h2>
    <div class="card-list">
      <content-card
        v-for="topic in topics"
        linkhref="#"
        :title="topic.title"
        :ntotal="topic.n_total"
        :ncomplete="topic.n_complete">
      </content-card>
    </div>

    <h2>Content</h2>
    <div class="card-list">
      <content-card
        v-for="content in contents"
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
      'breadcrumbs': require('../breadcrumbs'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        breadcrumbs: state => state.breadcrumbs,
        topics: state => state.topics,
        contents: state => state.contents,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @import 'jeet'
  @require '~core-theme.styl'
  // edit()

</style>
