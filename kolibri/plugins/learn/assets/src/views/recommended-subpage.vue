<template>

  <div>
    <k-breadcrumbs :items="breadcrumbItems" />
    <h1>{{ header }}</h1>
    <content-card-group-grid
      :contents="recommendations"
      :genContentLink="genContentLink"
      :showContentKindFilter="false"
    />
  </div>

</template>


<script>

  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../constants';
  import contentCardGroupGrid from './content-card-group-grid';
  import contentCardGroupHeader from './content-card-group-header';

  export default {
    name: 'recommendedSubpage',
    $trs: {
      popularPageHeader: 'Most popular',
      resumePageHeader: 'Resume',
      nextStepsPageHeader: 'Next steps',
      recommended: 'Recommended',
    },
    components: {
      contentCardGroupGrid,
      contentCardGroupHeader,
      kBreadcrumbs,
    },
    computed: {
      header() {
        switch (this.pageName) {
          case PageNames.RECOMMENDED_POPULAR:
            return this.$tr('popularPageHeader');
          case PageNames.RECOMMENDED_RESUME:
            return this.$tr('resumePageHeader');
          case PageNames.RECOMMENDED_NEXT_STEPS:
            return this.$tr('nextStepsPageHeader');
          default:
            return null;
        }
      },
      breadcrumbItems() {
        return [
          {
            text: this.$tr('recommended'),
            link: {
              name: PageNames.RECOMMENDED,
            },
          },
          {
            text: this.header,
          },
        ];
      },
    },
    methods: {
      genContentLink(id, kind) {
        return {
          name:
            kind === ContentNodeKinds.TOPIC
              ? PageNames.TOPICS_TOPIC
              : PageNames.RECOMMENDED_CONTENT,
          params: { id },
        };
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        recommendations: state => state.pageState.recommendations,
        channelTitle: state => state.pageState.channelTitle,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  h1
    font-size: 21px

</style>
