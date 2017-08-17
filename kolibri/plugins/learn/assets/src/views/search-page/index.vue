<template>

  <div>

    <h3>Search</h3>

    <search-box/>

    <p v-if="!searchTerm">{{ $tr('noSearch') }}</p>

    <template v-else>
      <h1 class="search-results">{{ $tr('showingResultsFor', { searchTerm }) }}</h1>
      <p class="search-channel">{{ $tr('withinChannel', { channelName }) }}</p>

      <p v-if="contents.length === 0">{{ $tr('noResultsMsg', { searchTerm }) }}</p>

      <content-card-grid v-else :gen-link="genLink" :contents="contents" />

      <!--if web running and results, show cards-->
      <div v-if="notAndroidAndKiwixResults">
        <h3>Results from Kiwix</h3>
        <ul>
          <li
            v-for="result in kiwixSearchResults"
            :key="result.link"
          >
            <a  :href="result.link" target="_blank">{{ result.title }}</a>
          </li>
        </ul>
      </div>

      <!--if web running and no results, show no results text-->

      <!--if web not running, show nothing-->

      <!--if android and installed, show link-->
      <div v-if="androidAndKiwixInstalled">
        <a :href="`kiwix://search/${searchTerm}`" target="_blank">Search for "{{ searchTerm }}" within Kiwix</a>
      </div>
    <a :href="`kiwix://search/${searchTerm}`" target="_blank">Search for "{{ searchTerm }}" within Kiwix</a>
      <!--if android and not installed, show nothing-->

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
  import { isAndroid } from 'kolibri.utils.sniffUserAgent';

  const kiwixIsInstalled = true;

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
    computed: {
      notAndroidAndKiwixResults() {
        return !isAndroid() && this.kiwixSearchResults;
      },
      androidAndKiwixInstalled() {
        return isAndroid() && kiwixIsInstalled;
      },
    },
    methods: {
      genLink(id, kind) {
        if (kind === ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.EXPLORE_TOPIC,
            params: {
              id,
              channel_id: this.channelId,
            },
          };
        }
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: {
            id,
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
        kiwixSearchResults: state => state.pageState.kiwixSearchResults,
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
