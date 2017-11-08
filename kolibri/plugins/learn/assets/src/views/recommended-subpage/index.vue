<template>

  <div>
    <content-card-group-header
      :header="header" />

    <content-card-group-grid
      :contents="recommendations"
      :genContentLink="genContentLink" />
  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import contentCardGroupGrid from '../content-card-group-grid';
  import contentCardGroupHeader from '../content-card-group-header';

  export default {
    name: 'recommendedSubpage',
    $trs: {
      popularPageHeader: 'Most popular',
      resumePageHeader: 'Resume',
      nextStepsPageHeader: 'Next steps',
      featuredPageHeader: 'Featured in {channelTitle}',
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
          case PageNames.RECOMMENDED_FEATURED:
            return this.$tr('featuredPageHeader', { channelTitle: this.channelTitle });
          default:
            return null;
        }
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


<style lang="stylus" scoped></style>
