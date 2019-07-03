<template>

  <div>

    <h3>{{ $tr('searchPageHeader') }}</h3>

    <SearchBox :filters="true" />

    <p v-if="!searchTerm">
      {{ $tr('noSearch') }}
    </p>

    <template v-else>
      <h1 v-if="contents.length === 0" class="search-results">
        {{ $tr('noResultsMsg', { searchTerm }) }}
      </h1>
      <h1 v-else class="search-results">
        {{ $tr('showingResultsFor', {
          searchTerm,
          totalResults: total_results
        }) }}
      </h1>


      <ContentCardGroupGrid
        :genContentLink="genContentLink"
        :contents="contents"
      />

      <KButton
        v-if="contents.length < total_results && !loading"
        :text="$tr('viewMore')"
        @click="loadMore"
      />
      <KCircularLoader
        v-else-if="contents.length < total_results && loading"
        :delay="false"
      />

    </template>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import { PageNames } from '../constants';
  import ContentCardGroupGrid from './ContentCardGroupGrid';
  import SearchBox from './SearchBox';

  export default {
    name: 'SearchPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      ContentCardGroupGrid,
      KButton,
      KCircularLoader,
      SearchBox,
    },
    data() {
      return {
        loading: false,
      };
    },
    computed: {
      ...mapState('search', ['contents', 'searchTerm', 'total_results']),
    },
    beforeDestroy() {
      // TODO do this clean up in a beforeRouteLeave once SearchPage is rendered in router-link
      this.$store.commit('search/RESET_STATE');
    },
    methods: {
      genContentLink(contentId, contentKind) {
        const params = { id: contentId };
        if (contentKind === ContentNodeKinds.TOPIC || contentKind === ContentNodeKinds.CHANNEL) {
          return this.$router.getRoute(PageNames.TOPICS_TOPIC, params);
        }
        return this.$router.getRoute(PageNames.TOPICS_CONTENT, params, this.$route.query);
      },
      loadMore() {
        if (!this.loading) {
          this.loading = true;
          this.$store.dispatch('search/loadMore').then(() => {
            this.loading = false;
          });
        }
      },
    },
    $trs: {
      searchPageHeader: 'Search',
      noSearch: 'Search by typing in the box above',
      showingResultsFor:
        "{totalResults, plural, one {{totalResults} result} other {{totalResults} results}} for '{searchTerm}'",
      noResultsMsg: "No results for '{searchTerm}'",
      documentTitle: 'Search',
      viewMore: 'View more',
    },
  };

</script>


<style lang="scss" scoped>

  .search-results {
    margin-top: 32px;
  }

  .search-channel {
    font-size: smaller;
  }

</style>
