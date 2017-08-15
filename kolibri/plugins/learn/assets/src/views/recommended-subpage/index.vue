<template>

  <div>
    <content-card-group-header
      :header="header"/>

    <content-card-group-grid
      :contents="recommendations"
      :gen-content-link="genContentLink" />
  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import contentCardGroupGrid from '../content-card-group-grid';
  import contentCardGroupHeader from '../content-card-group-header';

  export default {
    $trNameSpace: 'recommendedSubpage',
    $trs: {
      popularPageHeader: 'Most Popular',
      resumePageHeader: 'Resume',
      nextStepsPageHeader: 'Next steps',
      overviewPageHeader: 'Overview',
    },
    components: {
      contentCardGroupGrid,
      contentCardGroupHeader,
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
          case PageNames.RECOMMENDED_OVERVIEW:
            return this.$tr('overviewPageHeader');
          default:
            return null;
        }
      },
    },
    methods: {
      genContentLink(id) {
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        recommendations: state => state.pageState.recommendations,
        channelId: state => state.core.channels.currentId,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
