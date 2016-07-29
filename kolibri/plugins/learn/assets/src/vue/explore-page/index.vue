<template>

  <div>

    <page-header :title='title'>
      <breadcrumbs
        v-if='!isRoot'
        slot='extra-nav'
        :rootid='rootTopicId'
        :crumbs='topic.breadcrumbs'>
      </breadcrumbs>
      <div slot='icon'>
        <svg v-if="isRoot" src="../icons/explore.svg"></svg>
        <svg v-else src="../icons/folder.svg"></svg>
      </div>
    </page-header>

    <p v-if='topic.description'>
      {{ topic.description }}
    </p>

    <span class="visuallyhidden" v-if="subtopics.length">You can navigate groups of content through headings.</span>

    <card-list v-if="subtopics.length">
      <topic-list-item
        v-for="topic in subtopics"
        :id="topic.id"
        :title="topic.title"
        :ntotal="topic.n_total"
        :ncomplete="topic.n_complete">
      </topic-list-item>
    </card-list>

    <card-grid v-if="contents.length">
      <content-grid-item
        v-for="content in contents"
        class="card"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :id="content.id">
      </content-grid-item>
    </card-grid>

  </div>

</template>


<script>

  module.exports = {
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'page-header': require('../page-header'),
      'topic-list-item': require('../topic-list-item'),
      'content-grid-item': require('../content-grid-item'),
      'card-grid': require('../card-grid'),
      'card-list': require('../card-list'),
    },
    computed: {
      title() {
        // TODO - i18n
        return this.isRoot ? 'Explore' : this.topic.title;
      },
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


<style lang="stylus" scoped></style>
