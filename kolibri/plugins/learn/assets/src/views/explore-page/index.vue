<template>

  <div>

    <page-header :title="title">
      <div slot="icon">
        <mat-svg v-if="isRoot" category="action" name="explore"/>
        <mat-svg v-else category="file" name="folder"/>
      </div>
    </page-header>

    <p class="page-description" v-if="topic.description">
      {{ topic.description }}
    </p>

    <span class="visuallyhidden" v-if="subtopics.length">{{ $tr('navigate') }}</span>

    <card-grid v-if="contents.length">
      <content-grid-item
        v-for="content in contents"
        class="card"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :link="genLink(content)"/>
    </card-grid>

  </div>

</template>


<script>

  const getCurrentChannelObject = require('kolibri.coreVue.vuex.getters').getCurrentChannelObject;
  const PageNames = require('../../constants').PageNames;
  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;

  module.exports = {
    $trNameSpace: 'learnExplore',
    $trs: {
      explore: 'Topics',
      navigate: 'Navigate content using headings',
    },
    components: {
      'page-header': require('../page-header'),
      'topic-list-item': require('../topic-list-item'),
      'content-grid-item': require('../content-grid-item'),
      'card-grid': require('../card-grid'),
      'card-list': require('../card-list'),
    },
    computed: {
      title() {
        return this.isRoot ? this.$tr('explore') : this.topic.title;
      },
      subtopics() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.TOPIC);
      },
    },
    methods: {
      genLink(node) {
        if (node.kind !== ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.EXPLORE_CONTENT,
            params: { channel_id: this.channelId, id: node.id },
          };
        }
        return {
          name: PageNames.EXPLORE_TOPIC,
          params: { channel_id: this.channelId, id: node.id },
        };
      },
    },
    vuex: {
      getters: {
        topic: state => state.pageState.topic,
        contents: state => state.pageState.contents,
        isRoot: (state) => state.pageState.topic.id === getCurrentChannelObject(state).root_id,
        channelId: (state) => getCurrentChannelObject(state).id,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .page-description
    margin-top: 1em
    margin-bottom: 1em
    line-height: 1.5em

</style>
