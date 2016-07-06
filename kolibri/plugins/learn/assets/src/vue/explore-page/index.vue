<template>

  <div class="topic-page">
    <breadcrumbs></breadcrumbs>
    <div v-if="topics.length > 0">
      <h2>Topics</h2>
      <div class="card-list">
        <topic-card
          v-for="topic in topics"
          class="card"
          :id="topic.pk"
          :title="topic.title"
          :ntotal="topic.n_total"
          :ncomplete="topic.n_complete">
        </topic-card>
      </div>
    </div>

    <div v-if="contents.length > 0">
      <h2>Content</h2>
      <div class="card-list">
        <content-card
          v-for="content in contents"
          class="card"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :pk="content.pk">
        </content-card>
      </div>
    </div>
  </div>

</template>


<script>

  module.exports = {
    created() {
      this.fetchNodes(this.id);
    },
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        topics: state => state.topics,
        contents: state => state.contents,
        // from URL
        id: state => state.route.params.content_id,
      },
      actions: require('../../actions'),
    },
    watch: {
      id(value) {
        this.fetchNodes(value);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .topic-page
    padding-left: 10px

</style>
