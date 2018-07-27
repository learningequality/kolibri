<template>

  <div>
    <KBreadcrumbs
      v-if="!noContentOnDevice"
      :items="selectionCrumbs"
      :showSingleItem="true"
    />

    <template v-if="contentListEmpty">
      {{ emptyStateString }}
    </template>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import KBreadcrumbs from 'kolibri.coreVue.components.KBreadcrumbs';
  import { selectionRootLink, topicListingLink } from '../../lessonsRouterUtils';

  export default {
    name: 'SearchTools',
    components: {
      KBreadcrumbs,
    },
    data() {
      return {
        // TODO set using state
        searchMode: false,
        searchterm: '',
      };
    },
    computed: {
      ...mapState({
        ancestors: state => state.pageState.ancestors,
        lessonId: state => state.pageState.currentLesson.id,
        classId: state => state.classId,
        contentList: state => state.pageState.contentList,
      }),
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
            link: topicListingLink({ ...this.routerParams, topicId: a.id }),
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
    $trs: {
      noResourcesOnDeviceStatus: 'No Channels to select resources from',
      noResourcesInTopicStatus: 'No resources in this topic',
      channelBreadcrumbLabel: 'Channels',
      searchResultsLabel: "Search results for '{searchTerm}'",
      searchResultsEmptyLabel: "No search results for '{searchTerm}'",
    },
  };

</script>


<style lang="scss" scoped></style>
