<template>

  <div>

    <h3>Search</h3>

    <search-box/>

    <p v-if="!searchTerm">{{ $tr('noSearch') }}</p>

    <template v-else>
      <h1 class="search-results">{{ $tr('showingResultsFor', { searchTerm }) }}</h1>
      <p class="search-channel">{{ $tr('withinChannel', { channelName }) }}</p>

      <p v-if="contents.length === 0">{{ $tr('noResultsMsg', { searchTerm }) }}</p>

      <content-card-grid v-else :contents="contents">
        <template scope="content">
          <content-card
            :key="content.id"
            :title="content.title"
            :thumbnail="content.thumbnail"
            :progress="content.progress"
            :kind="content.kind"
            :link="genLink(content)"
          />
        </template>
      </content-card-grid>

    </template>

  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../../constants';
  import { getCurrentChannelObject } from 'kolibri.coreVue.vuex.getters';
  import contentCard from '../content-card';
  import contentCardGrid from '../content-card-grid';
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
      contentCardGrid,
      searchBox,
    },
    methods: {
      genLink(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.EXPLORE_TOPIC,
            params: {
              channel_id: this.channelId,
              id: content.id,
            },
          };
        }
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: {
            channel_id: this.channelId,
            id: content.id,
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
