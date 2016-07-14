<template>

  <div>

    <breadcrumbs
      v-if='!isRoot'
      :rootid='rootTopicId'
      :crumbs='topic.breadcrumbs'>
    </breadcrumbs>

    <h2 class='header'>
      <img class='header-icon' src='../folder.svg' alt=''>
      <div class='header-text'>
        {{ topic.title }}
      </div>
    </h2>

    <p v-if='topic.description'>
      {{ topic.description }}
    </p>

    <span class="visuallyhidden" v-if="subtopics.length">You can navigate groups of content through headings.</span>

    <card-grid :header="isRoot ? 'Topics' : '' " v-if="subtopics.length">
      <topic-card
        v-for="topic in subtopics"
        :id="topic.id"
        :title="topic.title"
        :ntotal="topic.n_total"
        :ncomplete="topic.n_complete">
      </topic-card>
    </card-grid>

    <card-grid :header="isRoot ? 'Content' : '' " v-if="contents.length">
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
        rootTopicId: state => state.rootTopicId,
        topic: state => state.pageState.topic,
        subtopics: state => state.pageState.subtopics,
        contents: state => state.pageState.contents,
        isRoot: (state) => state.pageState.topic.id === state.rootTopicId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .header
    position: relative
    margin-top: 0

  .header-icon
    display: block
    position: absolute
    top: 5px

  .header-text
    display: block
    margin-left: 45px

</style>
