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
        :filter="false"
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
        :filter="false"
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
        :filter="false"
        :contents="trimmedResume"/>
    </template>

    <template v-for="(contents, channelId) in featured" v-if="contents.length">
      <content-card-group-header
        :key="channelId"
        :header="$tr('featuredSectionHeader', { channelTitle: getChannelTitle(channelId) })"
        :view-more-page-link="featuredPageLink(channelId)"
        :show-view-more="contents.length > trimContent(contents).length"/>
      <component
        :key="channelId"
        :is="recommendationDisplay"
        :gen-content-link="genContentLink"
        :filter="false"
        :contents="trimContent(contents)"/>
    </template>

  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import contentCardGroupCarousel from '../content-card-group-carousel';
  import contentCardGroupGrid from '../content-card-group-grid';
  import contentCardGroupHeader from '../content-card-group-header';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { getChannels } from 'kolibri.coreVue.vuex.getters';

  const mobileCarouselLimit = 3;
  const desktopCarouselLimit = 15;

  export default {
    name: 'recommendedPage',
    $trs: {
      popularSectionHeader: 'Most popular',
      suggestedNextStepsSectionHeader: 'Next steps',
      resumeSectionHeader: 'Resume',
      featuredSectionHeader: 'Featured in { channelTitle }',
    },
    components: {
      contentCardGroupCarousel,
      contentCardGroupGrid,
      contentCardGroupHeader,
    },
    mixins: [responsiveWindow],
    computed: {
      isMobile() {
        return this.windowSize.breakpoint <= 1;
      },
      recommendationDisplay() {
        if (this.isMobile) {
          return contentCardGroupGrid;
        }
        return contentCardGroupCarousel;
      },
      carouselLimit() {
        return this.isMobile ? mobileCarouselLimit : desktopCarouselLimit;
      },
      popularPageLink() {
        return {
          name: PageNames.RECOMMENDED_POPULAR,
        };
      },
      nextStepsPageLink() {
        return {
          name: PageNames.RECOMMENDED_NEXT_STEPS,
        };
      },
      resumePageLink() {
        return {
          name: PageNames.RECOMMENDED_RESUME,
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
      trimmedFeatured() {
        return this.featured.slice(0, this.carouselLimit);
      },
    },
    methods: {
      genContentLink(id) {
        return {
          name: PageNames.RECOMMENDED_CONTENT,
          params: { id },
        };
      },
      trimContent(content) {
        return content.slice(0, this.carouselLimit);
      },
      featuredPageLink(channel_id) {
        return {
          name: PageNames.RECOMMENDED_FEATURED,
          params: { channel_id },
        };
      },
      getChannelTitle(channel_id) {
        return this.channels.find(channel => channel.id === channel_id).title;
      },
    },
    vuex: {
      getters: {
        channels: getChannels,
        nextSteps: state => state.pageState.nextSteps,
        popular: state => state.pageState.popular,
        resume: state => state.pageState.resume,
        featured: state => state.pageState.featured,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
