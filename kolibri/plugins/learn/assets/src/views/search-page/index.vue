<template>

  <div>

    <h3>Search</h3>

    <search-box/>

    <p v-if="!searchTerm">{{ $tr('noSearch') }}</p>

    <template v-else>
      <h1 class="search-results">{{ $tr('showingResultsFor', { searchTerm }) }}</h1>
      <p class="search-channel">{{ $tr('withinChannel', { channelName }) }}</p>

      <p v-if="contents.length === 0">{{ $tr('noResultsMsg', { searchTerm }) }}</p>

      <content-card-group-grid v-else :gen-content-link="genContentLink" :contents="contents" />

    </template>

  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../../constants';
  import { getCurrentChannelObject } from 'kolibri.coreVue.vuex.getters';
  import contentCard from '../content-card';
  import contentCardGroupGrid from '../content-card-group-grid';
  import searchBox from '../search-box';
  export default {
    name: 'learnSearch',
    $trs: {
      noSearch: 'Search by typing something in the search box above',
      showingResultsFor: 'Search results for "{searchTerm}"',
      withinChannel: 'Within {channelName}',
      noResultsMsg: 'No results for "{searchTerm}"',
    },
    components: {
      contentCard,
      contentCardGroupGrid,
      searchBox,
    },
    methods: {
      genContentLink(contentId, contentKind) {
        if (contentKind === ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.TOPICS_TOPIC,
            params: {
              id: contentId,
              channel_id: this.channelId,
            },
          };
        }
        return {
          name: PageNames.TOPICS_CONTENT,
          params: {
            id: contentId,
            channel_id: this.channelId,
          },
        };
      },
    },
    vuex: {
      getters: {
        contents: state => state.pageState.contents,
        searchTerm: state => state.pageState.searchTerm,
        channelId: state => state.core.channels.currentId,
        channelName: state => getCurrentChannelObject(state).title,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .search-results
    margin-top: 32px

  .search-channel
    font-size: smaller

</style>
