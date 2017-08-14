<template>

  <div>

    <template v-if="popular.length">
      <content-card-group-header
        :header="$tr('popularSectionHeader')"
        :view-more-page-link="popularPageLink"
        :show-view-more="popular.length > trimmedPopular.length"/>
      <component
        :is="recommendationDisplay"
        :gen-content-link="genContentLink"
        :contents="trimmedPopular"/>
    </template>

    <template v-if="nextSteps.length">
      <content-card-group-header
        :header="$tr('suggestedNextStepsSectionHeader')"
        :view-more-page-link="nextStepsPageLink"
        :show-view-more="nextSteps.length > trimmedNextSteps.length"/>
      <component
        :is="recommendationDisplay"
        :gen-content-link="genContentLink"
        :contents="trimmedNextSteps"/>
    </template>

    <template v-if="resume.length">
      <content-card-group-header
        :header="$tr('resumeSectionHeader')"
        :view-more-page-link="resumePageLink"
        :show-view-more="resume.length > trimmedResume.length"/>
      <component
        :is="recommendationDisplay"
        :gen-content-link="genContentLink"
        :contents="trimmedResume"/>
    </template>

    <template v-if="overview.length">
      <content-card-group-header
        :header="$tr('overviewSectionHeader')"
        :view-more-page-link="overviewPageLink"
        :show-view-more="true"/>
        :show-view-more="overview.length > trimmedOverview.length"/>
      <component
        :is="recommendationDisplay"
        :gen-content-link="genContentLink"
        :contents="trimmedOverview"/>
    </template>

  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import contentCardGroupCarousel from '../content-card-group-carousel';
  import contentCardGroupGrid from '../content-card-group-grid';
  import contentCardGroupHeader from '../content-card-group-header';
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
      contentCardGroupCarousel,
      contentCardGroupGrid,
      contentCardGroupHeader,
    },
    computed: {
      isMobile() {
        return this.windowSize.breakpoint <= 2;
      },
      recommendationDisplay() {
        if (this.isMobile) {
          return contentCardGroupGrid;
        }
        return contentCardGroupCarousel;
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
        return this.popular.slice(0, this.carouselLimit);
      },
      trimmedNextSteps() {
        return this.nextSteps.slice(0, this.carouselLimit);
      },
      trimmedResume() {
        return this.resume.slice(0, this.carouselLimit);
      },
      trimmedOverview() {
        return this.overview.slice(0, this.carouselLimit);
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
