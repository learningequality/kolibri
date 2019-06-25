<template>

  <div>
    <KBreadcrumbs :items="breadcrumbItems" />
    <h1>{{ header }}</h1>
    <ContentCardGroupGrid
      :contents="recommendations"
      :genContentLink="genContentLink"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import KBreadcrumbs from 'kolibri.coreVue.components.KBreadcrumbs';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../constants';
  import ContentCardGroupGrid from './ContentCardGroupGrid';
  import learnStringsMixin from './commonLearnStrings';

  export default {
    name: 'RecommendedSubpage',
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
    mixins: [learnStringsMixin],
    components: {
      ContentCardGroupGrid,
      KBreadcrumbs,
    },
    computed: {
      ...mapState(['pageName']),
      ...mapState('recommended/subpage', ['recommendations']),
      documentTitle() {
        switch (this.pageName) {
          case PageNames.RECOMMENDED_POPULAR:
            return this.$tr('documentTitleForPopular');
          case PageNames.RECOMMENDED_RESUME:
            return this.$tr('documentTitleForResume');
          case PageNames.RECOMMENDED_NEXT_STEPS:
            return this.$tr('documentTitleForNextSteps');
          default:
            return '';
        }
      },
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
            text: this.learnCommon$tr('recommendedLabel'),
            link: this.$router.getRoute(PageNames.RECOMMENDED),
          },
          {
            text: this.header,
          },
        ];
      },
    },
    methods: {
      genContentLink(id, kind) {
        const pageName =
          kind === ContentNodeKinds.TOPIC ? PageNames.TOPICS_TOPIC : PageNames.TOPICS_CONTENT;
        return this.$router.getRoute(pageName, { id }, { last: this.pageName });
      },
    },
    $trs: {
      popularPageHeader: 'Most popular',
      resumePageHeader: 'Resume',
      nextStepsPageHeader: 'Next steps',
      documentTitleForPopular: 'Popular',
      documentTitleForResume: 'Resume',
      documentTitleForNextSteps: 'Next Steps',
    },
  };

</script>


<style lang="scss" scoped>

  h1 {
    font-size: 21px;
  }

</style>
