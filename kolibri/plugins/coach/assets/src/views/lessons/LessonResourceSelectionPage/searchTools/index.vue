<template>

  <div>
    <!-- TODO make search box work, sets content on page -->

    <!-- TODO functionalize -->
    <!-- <search-box /> -->

    <!-- TODO add conditionalsearch exit button -->

    <k-breadcrumbs
      v-if="!noContentOnDevice"
      :items="selectionCrumbs"
      :showAllCrumbs="true"
    />

    <!-- TODO add conditional filters for search -->
    <!-- TODO add conditional search result strings -->
    <template v-if="contentListEmpty">
      {{ emptyStateString }}
    </template>
  </div>

</template>


<script>

  // import searchBox from '../../../../../../../learn/assets/src/views/search-box/';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import { selectionRootLink, topicListingLink } from '../../lessonsRouterUtils';

  export default {
    name: 'searchTools',
    components: {
      // searchBox,
      kBreadcrumbs,
    },
    data() {
      return {
        // TODO set using state
        searchMode: false,
        searchterm: '',
      };
    },
    computed: {
      // TODO cleanup, classId and lessonId are included in these routes all of these routes
      routerParams() {
        return { classId: this.classId, lessonId: this.lessonId };
      },
      selectionCrumbs() {
        // IDEA refactor router logic into actions
        return [
          // The "Channels" breadcrumb
          { text: this.$tr('channelBreadcrumbLabel'), link: selectionRootLink(this.routerParams) },
          // Ancestors breadcrumbs
          // NOTE: The current topic is injected into `ancestors` in the showPage action
          ...this.ancestors.map(a => ({
            text: a.title,
            link: topicListingLink({ ...this.routerParams, topicId: a.pk }),
          })),
        ];
      },
      contentListEmpty() {
        return Boolean(!this.contentList.length);
      },
      noContentOnDevice() {
        // IDEA could use pageName as indicator
        return Boolean(!this.ancestors) && Boolean(this.contentListEmpty);
      },
      emptyStateString() {
        if (this.searchMode) {
          return this.$tr('searchResultsEmptyLabel');
        } else if (this.noContentOnDevice) {
          return this.$tr('noResourcesOnDeviceStatus');
        } else {
          return this.$tr('noResourcesInTopicStatus');
        }
      },
    },
    methods: {},
    vuex: {
      getters: {
        ancestors: state => state.pageState.ancestors,
        lessonId: state => state.pageState.currentLesson.id,
        classId: state => state.classId,
        contentList: state => state.pageState.contentList,
      },
      actions: {},
    },
    $trs: {
      noResourcesOnDeviceStatus: 'No Channels to select resources from',
      noResourcesInTopicStatus: 'No resources in this topic',
      channelBreadcrumbLabel: 'Channels',
      searchResultsLabel: "Search results for '{searchTerm}'",
      searchResultsEmptyLabel: "No search results for '{searchTerm}'",
    },
  };

</script>


<style lang="stylus" scoped></style>
