<template>

  <div>

    <h3>Search</h3>

    <search-box />

    <p v-if="!searchTerm">{{ $tr('noSearch') }}</p>

    <template v-else>
      <h1 class="search-results">{{ $tr('showingResultsFor', { searchTerm }) }}</h1>

      <p v-if="contents.length === 0">{{ $tr('noResultsMsg', { searchTerm }) }}</p>

      <content-card-group-grid
        v-else
        :genContentLink="genContentLink"
        :contents="contents"
        :showContentKindFilter="true"
        :showChannelFilter="true"
      />

    </template>

  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../../constants';
  import contentCard from '../content-card';
  import contentCardGroupGrid from '../content-card-group-grid';
  import searchBox from '../search-box';
  export default {
    name: 'learnSearch',
    $trs: {
      noSearch: 'Search by typing something in the search box above',
      showingResultsFor: 'Search results for "{searchTerm}"',
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
            },
          };
        }
        return {
          name: PageNames.TOPICS_CONTENT,
          params: {
            id: contentId,
          },
        };
      },
    },
    vuex: {
      getters: {
        contents: state => state.pageState.contents,
        searchTerm: state => state.pageState.searchTerm,
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
