<template>

  <div>
    <div>
      <div v-if="!searchTerm">{{ $tr('noSearch') }}</div>

      <div v-else>
        <h2>{{ $tr('showingResultsFor', { searchTerm, channelName }) }}</h2>

        <div v-if="noResults">{{ $tr('noResults') }}</div>

        <div v-else>
          <p>{{ $tr('results', {count: numResults}) }}</p>

          <div v-if="topics.length">
            <h2>{{ $tr('topics') }}</h2>
            <card-list class="card-list">
              <topic-list-item
                v-for="topic in topics"
                class="card"
                :title="topic.title"
                :link="genTopicLink(topic.id)"/>
            </card-list>
          </div>

          <div v-if="contents.length">
            <h2>{{ $tr('content') }}</h2>
            <card-grid>
              <content-grid-item
                v-for="content in contents"
                class="card"
                :title="content.title"
                :thumbnail="content.thumbnail"
                :kind="content.kind"
                :progress="content.progress"
                :link="genContentLink(content.id)"/>
            </card-grid>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  const constants = require('../../constants');
  const getCurrentChannelObject = require('kolibri.coreVue.vuex.getters').getCurrentChannelObject;

  module.exports = {
    $trNameSpace: 'learnSearch',

    $trs: {
      search: 'Search',
      noSearch: 'Search by typing something in the search box above',
      noResults: 'No results',
      showingResultsFor: 'Showing results for "{searchTerm}" within {channelName}',
      results: '{count, number, integer} {count, plural, one {result} other {results}}',
      topics: 'Topics',
      content: 'Content',
    },
    components: {
      'topic-list-item': require('../topic-list-item'),
      'content-grid-item': require('../content-grid-item'),
      'card-grid': require('../card-grid'),
      'card-list': require('../card-list'),
    },
    computed: {
      noResults() {
        return !this.topics.length && !this.contents.length;
      },
      numResults() {
        return this.topics.length + this.contents.length;
      },
    },
    methods: {
      genTopicLink(id) {
        return {
          name: constants.PageNames.EXPLORE_TOPIC,
          params: { channel_id: this.channelId, id },
        };
      },
      genContentLink(id) {
        return {
          name: constants.PageNames.EXPLORE_CONTENT,
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
        channelName: state => getCurrentChannelObject(state).title,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
