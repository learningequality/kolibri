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

  import { PageNames } from '../../constants';
  import contentCardGroupGrid from '../content-card-group-grid';
  import contentCardGroupHeader from '../content-card-group-header';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';

  export default {
    name: 'recommendedSubpage',
    $trs: {
      popularPageHeader: 'Most popular',
      resumePageHeader: 'Resume',
      nextStepsPageHeader: 'Next steps',
      featuredPageHeader: 'Featured in {channelTitle}',
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
          case PageNames.RECOMMENDED_FEATURED:
            return this.$tr('featuredPageHeader', { channelTitle: this.channelTitle });
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
      genContentLink(id) {
        return {
          name: PageNames.RECOMMENDED_CONTENT,
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
