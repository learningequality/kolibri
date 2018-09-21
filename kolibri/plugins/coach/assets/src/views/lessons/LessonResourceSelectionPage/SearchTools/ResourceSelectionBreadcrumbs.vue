<template>

  <KBreadcrumbs :items="selectionCrumbs" />

</template>


<script>

  import { mapState } from 'vuex';
  import KBreadcrumbs from 'kolibri.coreVue.components.KBreadcrumbs';
  import { selectionRootLink, topicListingLink } from '../../lessonsRouterUtils';

  export default {
    name: 'ResourceSelectionBreadcrumbs',
    components: {
      KBreadcrumbs,
    },
    computed: {
      ...mapState('lessonSummary/resources', ['ancestors']),
      selectionCrumbs() {
        const routerParams = this.$route.params;
        return [
          // The "Channels" breadcrumb
          { text: this.$tr('channelBreadcrumbLabel'), link: selectionRootLink(routerParams) },
          // Ancestors breadcrumbs
          // NOTE: The current topic is injected into `ancestors` in the showPage action
          ...this.ancestors.map(a => ({
            text: a.title,
            link: topicListingLink({ ...routerParams, topicId: a.id }),
          })),
        ];
      },
    },
    $trs: {
      channelBreadcrumbLabel: 'Channels',
    },
  };

</script>


<style lang="scss" scoped></style>
