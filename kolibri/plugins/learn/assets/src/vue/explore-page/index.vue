<template>

  <div class="topic-page">
    <br><br>
    <breadcrumbs :crumbs="breadcrumbs.crumbs" :current="breadcrumbs.current"></breadcrumbs>
    <div v-if="topics.length > 0">
      <h2>Topics</h2>
      <div class="card-list">
        <topic-card
          v-for="topic in topics"
          v-on:click="fetchNodes(topic.id)"
          class="card"
          linkhref="#"
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
          linkhref="#"
          :title="content.title"
          :thumbsrc="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :pk="content.id">
        </content-card>
      </div>
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
      actions: require('../../actions'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .topic-page
    padding-left: 10px

</style>
