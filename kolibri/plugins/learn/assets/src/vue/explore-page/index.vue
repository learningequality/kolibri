<template>

  <breadcrumbs v-if="breadcrumbs"></breadcrumbs>

  <card-grid header="Topics" v-if="topics.length">
    <topic-card
      v-for="topic in topics"
      :id="topic.pk"
      :title="topic.title"
      :ntotal="topic.n_total"
      :ncomplete="topic.n_complete">
    </topic-card>
  </card-grid>

  <card-grid header="Content" v-if="contents.length">
    <content-card
      v-for="content in contents"
      class="card"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :progress="content.progress"
      :id="content.pk">
    </content-card>

  </card-grid>

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
      'card-grid': require('../card-grid'),
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


<style lang="stylus" scoped></style>
