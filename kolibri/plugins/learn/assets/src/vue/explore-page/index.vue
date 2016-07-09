<template>

  <breadcrumbs v-if="breadcrumbs"></breadcrumbs>

  <h2 v-if='topic.title && !isRoot'>
    {{ topic.title }}
  </h2>
  <p v-if='topic.description'>
    {{ topic.description }}
  </p>

  <card-grid v-if="subtopics.length">
    <topic-card
      v-for="topic in subtopics"
      :id="topic.id"
      :title="topic.title"
      :ntotal="topic.n_total"
      :ncomplete="topic.n_complete">
    </topic-card>
  </card-grid>

  <card-grid v-if="contents.length">
    <content-card
      v-for="content in contents"
      class="card"
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
      'breadcrumbs': require('../breadcrumbs'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
      'card-grid': require('../card-grid'),
    },
    vuex: {
      getters: {
        topic: state => state.pageState.topic,
        subtopics: state => state.pageState.subtopics,
        contents: state => state.pageState.contents,
        isRoot: (state) => state.pageState.topic.id === state.rootTopicId,
      },
      actions: require('../../actions'),
    },
  };

</script>


<style lang="stylus" scoped></style>
