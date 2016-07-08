<template>

  <div class="topic-page">
    <breadcrumbs></breadcrumbs>
    <div v-if="topics.length > 0">
      <h2>Topics</h2>
      <div class="card-list">
        <topic-card
          v-for="topic in topics"
          class="card"
          :id="topic.id"
          :title="topic.title"
        >
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
          :id="content.id"
        >
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
        topics: state => state.pageState.topics,
        contents: state => state.pageState.contents,
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
