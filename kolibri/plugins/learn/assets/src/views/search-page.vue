<template>

  <div>

    <h3>{{ $tr('searchPageHeader') }}</h3>

    <search-box />

    <p v-if="!searchTerm">{{ $tr('noSearch') }}</p>

    <template v-else>
      <h1 class="search-results">{{ $tr('showingResultsFor', { searchTerm }) }}</h1>

      <p v-if="contents.length === 0">{{ $tr('noResultsMsg', { searchTerm }) }}</p>

      <content-card-group-grid
        v-else
        :genContentLink="genContentLink"
        :contents="searchContents"
        :showContentKindFilter="true"
        :showChannelFilter="true"
      />

    </template>

  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import sortBy from 'lodash/sortBy';

  import { PageNames } from '../constants';
  import contentCard from './content-card';
  import contentCardGroupGrid from './content-card-group-grid';
  import searchBox from './search-box';

  export default {
    name: 'searchPage',
    $trs: {
      searchPageHeader: 'Search',
      noSearch: 'Search by typing in the box above',
      showingResultsFor: "Results for '{searchTerm}'",
      noResultsMsg: "No results for '{searchTerm}'",
    },
    components: {
      contentCard,
      contentCardGroupGrid,
      searchBox,
    },
    computed: {
      searchContents() {
        return sortBy(this.contents, content => content.channel_id !== content.content_id);
      },
    },
    methods: {
      genContentLink(contentId, contentKind) {
        if (contentKind === ContentNodeKinds.TOPIC || contentKind === ContentNodeKinds.CHANNEL) {
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
