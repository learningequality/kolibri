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

    <content-card-grid :contents="contents" v-if="contents.length" :gen-link="genLink"/>

  </div>

</template>


<script>

  const getCurrentChannelObject = require('kolibri.coreVue.vuex.getters').getCurrentChannelObject;
  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;
  const { PageNames } = require('../../constants');

  module.exports = {
    $trNameSpace: 'learnExplore',
    $trs: {
      explore: 'Topics',
      navigate: 'Navigate content using headings',
    },
    components: {
      'page-header': require('../page-header'),
      'content-card-grid': require('../content-card-grid'),
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
      genLink(id, kind) {
        if (kind === 'topic') {
          return {
            name: PageNames.EXPLORE_TOPIC,
            params: { channel_id: this.channelId, id },
          };
        }
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: { channel_id: this.channelId, id },
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
