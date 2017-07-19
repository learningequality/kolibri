<template>

  <div>
    <component
      :is="recommendationDisplay"
      v-if="popular.length"
      :show-view-more="popular.length > trimmedPopular.length"
      :view-more-page-link="popularPageLink"
      :gen-content-link="genContentLink"
      :contents="trimmedPopular"
      :header="$tr('popularSectionHeader')"
    <component
      :is="recommendationDisplay"
      v-if="nextSteps.length"
      :show-view-more="nextSteps.length > trimmedNextSteps.length"
      :view-more-page-link="nextStepsPageLink"
      :gen-content-link="genContentLink"
      :contents="trimmedNextSteps"
      :header="$tr('suggestedNextStepsSectionHeader')"
    <component
      :is="recommendationDisplay"
      v-if="resume.length"
      :show-view-more="resume.length > trimmedResume.length"
      :view-more-page-link="resumePageLink"
      :gen-content-link="genContentLink"
      :contents="trimmedResume"
      :header="$tr('resumeSectionHeader')"
    <component
      :is="recommendationDisplay"
      v-if="overview.length"
      :show-view-more="overview.length > trimmedOverview.length"
      :view-more-page-link="overviewPageLink"
      :gen-content-link="genContentLink"
      :header="$tr('overviewSectionHeader')"
      :contents="trimmedOverview"
  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import contentCardCarousel from '../content-card-carousel';
  import contentCardGroupGrid from '../content-card-group-grid';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  const mobileCarouselLimit = 3;
  const desktopCarouselLimit = 15;

  export default {
    name: 'recommendedPage',
    $trs: {
      popularSectionHeader: 'Most popular',
      suggestedNextStepsSectionHeader: 'Next steps',
      resumeSectionHeader: 'Resume',
      overviewSectionHeader: 'Overview',
    },
    mixins: [responsiveWindow],
    components: {
      contentCardCarousel,
      contentCardGroupGrid,
    },
    computed: {
      isMobile() {
        return this.windowSize.breakpoint <= 2;
      },
      recommendationDisplay() {
        if (this.isMobile) {
          return contentCardGroupGrid;
        }
        return contentCardCarousel;
      },
      carouselLimit() {
        return this.mobile ? mobileCarouselLimit : desktopCarouselLimit;
      },
      popularPageLink() {
        return {
          name: PageNames.RECOMMENDED_POPULAR,
          params: { channel_id: this.channelId },
        };
      },
      nextStepsPageLink() {
        return {
          name: PageNames.RECOMMENDED_NEXT_STEPS,
          params: { channel_id: this.channelId },
        };
      },
      resumePageLink() {
        return {
          name: PageNames.RECOMMENDED_RESUME,
          params: { channel_id: this.channelId },
        };
      },
      overviewPageLink() {
        return {
          name: PageNames.RECOMMENDED_OVERVIEW,
          params: { channel_id: this.channelId },
        };
      },
      trimmedPopular() {
        if (this.needsTrim(this.popular.length)) {
          return this.popular.slice(0, this.carouselLimit);
        }
        return this.popular;
      },
      trimmedNextSteps() {
        if (this.needsTrim(this.nextSteps.length)) {
          return this.nextSteps.slice(0, this.carouselLimit);
        }
        return this.nextSteps;
      },
      trimmedResume() {
        if (this.needsTrim(this.resume.length)) {
          return this.resume.slice(0, this.carouselLimit);
        }
        return this.resume;
      },
      trimmedOverview() {
        if (this.needsTrim(this.overview.length)) {
          return this.overview.slice(0, this.carouselLimit);
        }
        return this.overview;
      },
    },
    methods: {
      genContentLink(id, kind) {
        if (kind === 'topic') {
          return {
            name: PageNames.EXPLORE_TOPIC,
            params: { channel_id: this.channelId, id },
          };
        }
        return {
          name: PageNames.LEARN_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
      subHeader(carouselItems, allItems) {
        if (this.needsTrim(allItems.length)) {
          const trArgs = {
            subset: carouselItems.length,
            total: allItems.length,
          };
          return this.$tr('subsetSectionSubHeader', trArgs);
        }
        return this.$tr('sectionSubHeader', { numOfItems: carouselItems.length });
      },
    },
    vuex: {
      getters: {
        channelId: state => state.pageState.channelId,
        nextSteps: state => state.pageState.nextSteps,
        popular: state => state.pageState.popular,
        resume: state => state.pageState.resume,
        overview: state => state.pageState.overview,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
