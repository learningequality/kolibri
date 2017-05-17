<template>

  <div>
    <p v-if="!searchTerm">{{ $tr('noSearch') }}</p>

    <template v-else>
      <h1>{{ $tr('showingResultsFor', { searchTerm, channelName }) }}</h1>

      <p v-if="noResults">{{ $tr('noResults') }}</p>

      <template v-else>

        <h2>{{ $tr('filterContent') }}</h2>

        <tabs>
          <tab-button
            type="icon-and-title"
            :title="$tr('all', { num: all.length } )"
            icon="layers"
            @click="filter = 'all'"
            :selected="filter === 'all'"
          />
          <tab-button
            type="icon-and-title"
            :title="$tr('exercises', { num: exercises.length } )"
            icon="star"
            :selected="filter === contentNodeKinds.EXERCISE"
            @click="filter = contentNodeKinds.EXERCISE"
          />
          <tab-button
            type="icon-and-title"
            :title="$tr('videos', { num: videos.length } )"
            icon="ondemand_video"
            :selected="filter === contentNodeKinds.VIDEO"
            @click="filter = contentNodeKinds.VIDEO"
          />
          <tab-button
            type="icon-and-title"
            :title="$tr('topics', { num: topics.length } )"
            icon="folder"
            :selected="filter === contentNodeKinds.TOPIC"
            @click="filter = contentNodeKinds.TOPIC"
          />
          <tab-button
            type="icon-and-title"
            :title="$tr('documents', { num: documents.length } )"
            icon="description"
            :selected="filter === contentNodeKinds.DOCUMENT"
            @click="filter = contentNodeKinds.DOCUMENT"
          />
          <tab-button
            type="icon-and-title"
            icon="widgets"
            :title="$tr('html5', { num: html5.length } )"
            :selected="filter === contentNodeKinds.HTML5"
            @click="filter = contentNodeKinds.HTML5"
          />
        </tabs>

        <card-grid>
          <content-grid-item
            v-for="item in filteredResults"
            :title="item.title"
            :thumbnail="item.thumbnail"
            :progress="item.progress"
            :kind="item.kind || 'topic'"
            :link="item.kind ? genContentLink(item.id) : genTopicLink(item.id)"
          />
        </card-grid>

      </template>

    </template>

  </div>

</template>


<script>

  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;
  const PageNames = require('../../constants').PageNames;
  const GetCurrentChannelObject = require('kolibri.coreVue.vuex.getters').getCurrentChannelObject;

  module.exports = {
    $trNameSpace: 'learnSearch',

    $trs: {
      search: 'Search',
      noSearch: 'Search by typing something in the search box above',
      noResults: 'No results',
      showingResultsFor: 'Showing results for "{searchTerm}" within {channelName}',
      results: '{count, number, integer} {count, plural, one {result} other {results}}',
      filterContent: 'Filter content by: ',
      all: 'All ({ num, number })',
      content: 'Content',
      exercises: 'Exercises ({ num, number })',
      videos: 'Videos ({ num, number })',
      topics: 'Topics ({ num, number })',
      documents: 'Documents ({ num, number })',
      html5: 'HTML5 apps ({ num, number })',
    },
    components: {
      'content-grid-item': require('../content-grid-item'),
      'card-grid': require('../card-grid'),
      'card-list': require('../card-list'),
      'tabs': require('kolibri.coreVue.components.tabs'),
      'tab-button': require('kolibri.coreVue.components.tabButton'),
    },
    data() {
      return {
        filter: 'all',
      };
    },
    computed: {
      contentNodeKinds() {
        return ContentNodeKinds;
      },
      noResults() {
        return !this.topics.length && !this.contents.length;
      },
      all() {
        return this.contents.concat(this.topics);
      },
      exercises() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.EXERCISE);
      },
      videos() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.VIDEO);
      },
      documents() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.DOCUMENT);
      },
      html5() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.HTML5);
      },
      filteredResults() {
        if (this.filter === ContentNodeKinds.EXERCISE) {
          return this.exercises;
        } else if (this.filter === ContentNodeKinds.VIDEO) {
          return this.videos;
        } else if (this.filter === ContentNodeKinds.TOPIC) {
          return this.topics;
        } else if (this.filter === ContentNodeKinds.DOCUMENT) {
          return this.documents;
        } else if (this.filter === ContentNodeKinds.HTML5) {
          return this.html5;
        }
        return this.all;
      },
      numFiltered() {
        return this.filteredResults.length;
      }
    },
    methods: {
      genTopicLink(id) {
        return {
          name: PageNames.EXPLORE_TOPIC,
          params: { channel_id: this.channelId, id },
        };
      },
      genContentLink(id) {
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    vuex: {
      getters: {
        contents: state => state.pageState.contents,
        topics: state => state.pageState.topics,
        searchTerm: state => state.pageState.searchTerm,
        channelId: (state) => state.core.channels.currentId,
        channelName: state => GetCurrentChannelObject(state).title,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
