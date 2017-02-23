<template>

  <div>
    <form @submit.prevent="submitSearch">
      <ui-textbox
        name="search"
        :label="$tr('search')"
        :placeholder="`${$tr('searchWithin')} ${channelName}`"
        type="search"
        icon="search"
        :autofocus="true"
        v-model="searchInput"/>
      <ui-icon-button
        primary="true"
        buttonType="submit"
        icon="search"
        :ariaLabel="$tr('submitSearch')">
      </ui-icon-button>
    </form>

    <!-- results -->
    <div class="results" v-if="!loading">
      <h1 v-if="searchTerm">
        {{ message }}
      </h1>

      <h2 v-if="topics.length">
        Topic
      </h2>

      <card-list class="card-list" v-if="topics.length">
        <topic-list-item
          v-for="topic in topics"
          class="card"
          :id="topic.id"
          :channelId="channelId"
          :title="topic.title"/>
      </card-list>

      <h2 v-if="contents.length">
        Content
      </h2>

      <card-grid v-if="contents.length">
        <content-grid-item
          v-for="content in contents"
          class="card"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :id="content.id"/>
      </card-grid>
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
      searchResults: 'Search results:',
      noMatches: 'Could not find any matches',
      cancel: 'Cancel',
      submitSearch: 'Submit Search',
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
      message() {
        if (this.topics.length || this.contents.length) {
          return this.$tr('searchResults');
        } else if (!this.topics.length && !this.contents.length) {
          return this.$tr('noMatches');
        }
        return '';
      },
    },
    methods: {
      submitSearch() {
        this.$router.push({
          name: constants.PageNames.SEARCH,
          params: { channel_id: this.channelId },
          query: { query: this.searchInput },
        });
        this.triggerSearchAction();
      },
      triggerSearchAction() {
        this.triggerSearch(this.searchInput);
      },
    },

    vuex: {
      getters: {
        contents: state => state.searchState.contents,
        topics: state => state.searchState.topics,
        loading: state => state.searchLoading,
        searchTerm: state => state.searchState.searchTerm,
        searchOpen: state => state.searchOpen,
        channelId: (state) => state.core.channels.currentId,
        channelName: state => getCurrentChannelObject(state).title,
      },
      actions: {
        triggerSearch: actions.triggerSearch,
        toggleSearch: actions.toggleSearch,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
