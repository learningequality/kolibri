<template>

  <div>
    <form @submit.prevent="submitSearch">
      <ui-textbox
        name="search"
        :label="$tr('search')"
        :placeholder="`${$tr('searchWithin')} ${channelName}`"
        type="search"
        :autofocus="true"
        v-model="searchInput"
        class="search-input"/>
      <ui-icon-button
        primary="true"
        color="primary"
        buttonType="submit"
        icon="search"
        :ariaLabel="$tr('submitSearch')"/>
    </form>

    <div>
      <div v-if="!searchTerm">{{ $tr('noSearch') }}</div>

      <div v-else>
        <h1>{{ $tr('showingResultsFor') }} "{{ searchTerm }}"</h1>

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

  const actions = require('../../actions');
  const constants = require('../../state/constants');
  const getCurrentChannelObject = require('kolibri.coreVue.vuex.getters').getCurrentChannelObject;

  module.exports = {
    $trNameSpace: 'learnSearch',

    $trs: {
      search: 'Search',
      searchWithin: 'Search within',
      noSearch: 'Search by typing something above',
      noResults: 'No results',
      submitSearch: 'Submit search',
      showingResultsFor: 'Showing results for',
      results: '{count, number, integer} {count, plural, one {result} other {results}}',
      topics: 'Topics',
      content: 'Content',
    },
    data: () => ({
      searchInput: '',
    }),
    components: {
      'ui-textbox': require('keen-ui/src/UiTextbox'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
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
      submitSearch() {
        const searchInput = this.searchInput.trim();
        if (searchInput) {
          this.$router.push({
            name: constants.PageNames.SEARCH,
            params: { channel_id: this.channelId },
            query: { query: searchInput },
          });
        }
      },
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
    mounted() {
      this.searchInput = this.searchTerm;
    },
    vuex: {
      getters: {
        contents: state => state.pageState.contents,
        topics: state => state.pageState.topics,
        searchTerm: state => state.pageState.searchTerm,
        channelId: (state) => state.core.channels.currentId,
        channelName: state => getCurrentChannelObject(state).title,
      },
      actions: {
        triggerSearch: actions.triggerSearch,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .search-input
    display: inline-block
    width: calc(100% - 41px)

</style>
