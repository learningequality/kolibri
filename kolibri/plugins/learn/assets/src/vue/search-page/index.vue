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
      <div v-if="!searchTerm">There's nothing here! Search by typing something above!</div>

      <div v-else>
        <h1>Showing results for <strong>"{{ searchTerm }}"</strong></h1>

        <div v-if="noResults">No results.</div>

        <div v-else>
          <p>{{ numResults }} Results</p>

          <div v-if="topics.length">
            <h2>Topics</h2>
            <card-list class="card-list">
              <topic-list-item
                v-for="topic in topics"
                class="card"
                :id="topic.id"
                :channelId="channelId"
                :title="topic.title"/>
            </card-list>
          </div>

          <div v-if="topics.length">
            <h2>Content</h2>
            <card-grid>
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
    },

    vuex: {
      getters: {
        contents: state => state.pageState.searchState.contents,
        topics: state => state.pageState.searchState.topics,
        searchTerm: state => state.pageState.searchState.searchTerm,
        loading: state => state.pageState.searchLoading,
        channelId: (state) => state.core.channels.currentId,
        channelName: state => getCurrentChannelObject(state).title,
      },
      actions: {
        triggerSearch: actions.triggerSearch,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
