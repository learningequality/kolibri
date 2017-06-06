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

    <ui-select
      :label="$tr('display')"
      :options="filterOptions"
      v-model="selectedFilter"
      class="filter"
    />

    <span class="visuallyhidden" v-if="subtopics.length">{{ $tr('navigate') }}</span>

    <card-grid v-if="filteredContents.length">
      <content-grid-item
        v-for="content in filteredContents"
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
      all: 'All content',
      topics: 'Topics',
      exercises: 'Exercises',
      videos: 'Videos',
      audio: 'Audio',
      documents: 'Documents',
      html5: 'HTML5 Apps',
      display: 'Display',
    },
    components: {
      'page-header': require('../page-header'),
      'topic-list-item': require('../topic-list-item'),
      'content-grid-item': require('../content-grid-item'),
      'card-grid': require('../card-grid'),
      'card-list': require('../card-list'),
      'ui-select': require('keen-ui/src/UiSelect'),
    },
    data: () => ({
      selectedFilter: '',
    }),
    computed: {
      filterOptions() {
        const options = [{ label: this.$tr('all'), value: 'all' }];
        if (this.contentsContain(ContentNodeKinds.TOPIC)) {
          options.push({ label: this.$tr('topics'), value: ContentNodeKinds.TOPIC });
        }
        if (this.contentsContain(ContentNodeKinds.EXERCISE)) {
          options.push({ label: this.$tr('exercises'), value: ContentNodeKinds.EXERCISE });
        }
        if (this.contentsContain(ContentNodeKinds.VIDEO)) {
          options.push({ label: this.$tr('videos'), value: ContentNodeKinds.VIDEO });
        }
        if (this.contentsContain(ContentNodeKinds.AUDIO)) {
          options.push({ label: this.$tr('audio'), value: ContentNodeKinds.AUDIO });
        }
        if (this.contentsContain(ContentNodeKinds.DOCUMENT)) {
          options.push({ label: this.$tr('documents'), value: ContentNodeKinds.DOCUMENT });
        }
        if (this.contentsContain(ContentNodeKinds.HTML5)) {
          options.push({ label: this.$tr('html5'), value: ContentNodeKinds.HTML5 });
        }
        return options;
      },
      title() {
        return this.isRoot ? this.$tr('explore') : this.topic.title;
      },
      subtopics() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.TOPIC);
      },
      filteredContents() {
        if (this.selectedFilter.value === 'all') {
          return this.contents;
        }
        return this.contents.filter(content => content.kind === this.selectedFilter.value);
      },
    },
    methods: {
      contentsContain(kind) {
        return Boolean(this.contents.filter(content => content.kind === kind).length);
      },
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
    mounted() {
      this.selectedFilter = this.filterOptions[0];
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

  .filter
    width: 200px
    margin-top: 2em

</style>
