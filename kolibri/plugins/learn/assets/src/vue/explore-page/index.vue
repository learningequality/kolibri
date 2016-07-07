<template>

  <div class="topic-page">
    <breadcrumbs :crumbs="breadcrumbs.crumbs" :current="breadcrumbs.current"></breadcrumbs>

    <card-grid header="Topics" v-if="topics.length">
      <topic-card
        v-for="topic in topics"
        v-on:click="fetchNodes(topic.pk)"
        :title="topic.title"
        :ntotal="topic.n_total"
        :ncomplete="topic.n_complete">
      </topic-card>
    </card-grid>

    <card-grid header="Content" v-if="contents.length">
      <content-card
        v-for="content in contents"
        :title="content.title"
        :thumbsrc="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :pk="content.pk">
      </content-card>
    </card-grid>

  </div>

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
        // better practice would be to define vuex getter functions globally
        breadcrumbs: state => state.breadcrumbs,
        topics: state => state.topics,
        contents: state => state.contents,
      },
      // actions: require('../../actions'),
    },
  };

</script>


<style lang="stylus" scoped></style>
