<template>

  <div>

    <!-- TODO make serach box work, sets content on page -->
    <search-box />

    <!-- TODO add conditionalsearch exit button -->

    <k-breadcrumbs
      :items="selectionCrumbs"
      :showAllCrumbs="true"
    />

    <!-- TODO add conditional filters for search -->
    <!-- TODO add conditional search result strings -->
  </div>

</template>


<script>

  import searchBox from '../../../../../../../learn/assets/src/views/search-box/';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import { selectionRootLink, topicListingLink } from '../../lessonsRouterUtils';

  export default {
    name: 'searchTools',
    components: {
      searchBox,
      kBreadcrumbs,
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
    },
    methods: {},
    vuex: {
      getters: {
        ancestors: state => state.pageState.ancestors,
        lessonId: state => state.pageState.currentLesson.id,
        classId: state => state.classId,
      },
      actions: {},
    },
    $trs: {
      channelBreadcrumbLabel: 'Channels',
      searchResultsLabel: "Search results for '{searchTerm}'",
      searchResultsEmptyLabel: "No search results for '{searchTerm}'",
    },
  };

</script>


<style lang="stylus" scoped></style>
