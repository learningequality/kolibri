<template>

  <div>
    <page-header :title="$tr('pageHeader')">
      <mat-svg slot="icon" category="action" name="home"/>
    </page-header>
    <component
      v-if="trimmedResume.length"
      :is="recommendationDisplay"
      :gen-link="genLink"
      :contents="trimmedResume"
      :header="$tr('resumeSectionHeader')"
      :filter="false"
      :subheader="$tr('resumeSectionSubHeader', {numOfItems: trimmedResume.length})"/>
    <component
      v-if="trimmedNextSteps.length"
      :is="recommendationDisplay"
      :gen-link="genLink"
      :contents="trimmedNextSteps"
      :header="$tr('suggestedNextStepsSectionHeader')"
      :filter="false"
      :subheader="$tr('suggestedNextStepsSectionSubHeader', {numOfItems: trimmedNextSteps.length})"/>
    <component
      v-if="trimmedPopular.length"
      :is="recommendationDisplay"
      :gen-link="genLink"
      :contents="trimmedPopular"
      :header="$tr('popularSectionHeader')"
      :filter="false"
      :subheader="$tr('popularSectionSubHeader', {numOfItems: trimmedPopular.length})"/>
    <component
      v-if="trimmedOverview.length"
      :is="recommendationDisplay"
      :showViewAll="true"
      :gen-link="genLink"
      :header="$tr('overviewSectionHeader')"
      :filter="false"
      :contents="trimmedOverview" />
  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import { getCurrentChannelObject } from 'kolibri.coreVue.vuex.getters';
  import pageHeader from '../page-header';
  import contentCardCarousel from '../content-card-carousel';
  import contentCardGrid from '../content-card-grid';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  const mobileCardNumber = 3;

  export default {
    name: 'recommendedPage',
    $trNameSpace: 'recommendedPage',
    $trs: {
      pageHeader: 'Recommended',
      popularSectionHeader: 'Most popular',
      suggestedNextStepsSectionHeader: 'Next steps',
      resumeSectionHeader: 'Resume',
      popularSectionSubHeader: '{numOfItems, number} popular items',
      suggestedNextStepsSectionSubHeader: '{numOfItems, number} suggested items',
      resumeSectionSubHeader: '{numOfItems, number} items to be resumed',
      overviewSectionHeader: 'Overview',
    },
    mixins: [responsiveWindow],
    components: {
      pageHeader,
      contentCardCarousel,
      contentCardGrid,
    },
    computed: {
      isMobile() {
        return this.windowSize.breakpoint <= 2;
      },
      recommendationDisplay() {
        if (this.isMobile) {
          return contentCardGrid;
        }
        return contentCardCarousel;
      },
      trimmedResume() {
        if (this.isMobile) {
          return this.recommendations.resume.slice(0, mobileCardNumber);
        }
        return this.recommendations.resume;
      },
      trimmedNextSteps() {
        if (this.isMobile) {
          return this.recommendations.nextSteps.slice(0, mobileCardNumber);
        }
        return this.recommendations.nextSteps;
      },
      trimmedPopular() {
        if (this.isMobile) {
          return this.recommendations.popular.slice(0, mobileCardNumber);
        }
        return this.recommendations.popular;
      },
      trimmedOverview() {
        if (this.isMobile) {
          return this.all.content.slice(0, mobileCardNumber);
        }
        return this.all.content;
      },
    },
    methods: {
      genLink(id, kind) {
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
    },
    vuex: {
      getters: {
        all: state => state.pageState.all,
        channelId: state => getCurrentChannelObject(state).id,
        recommendations: state => state.pageState.recommendations,
        channelTitle: state => state.pageState.channelTitle,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
