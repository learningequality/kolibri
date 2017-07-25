<template>

  <div>
    <page-header :title="$tr('pageHeader')">
      <mat-svg slot="icon" category="action" name="home"/>
    </page-header>
    <content-card-carousel
      v-if="trimmedResume.length"
      :gen-link="genLink"
      :contents="trimmedResume"
      :header="$tr('resumeSectionHeader')"
      :subheader="$tr('resumeSectionSubHeader', {numOfItems: trimmedResume.length})"/>
    <content-card-carousel
      v-if="trimmedNextSteps.length"
      :gen-link="genLink"
      :contents="trimmedNextSteps"
      :header="$tr('suggestedNextStepsSectionHeader')"
      :subheader="$tr('suggestedNextStepsSectionSubHeader', {numOfItems: trimmedNextSteps.length})"/>
    <content-card-carousel
      v-if="trimmedPopular.length"
      :gen-link="genLink"
      :contents="trimmedPopular"
      :header="$tr('popularSectionHeader')"
      :subheader="$tr('popularSectionSubHeader', {numOfItems: trimmedPopular.length})"/>
    <content-card-carousel
      v-if="trimmedOverview.length"
      :showViewAll="true"
      :gen-link="genLink"
      :header="$tr('overviewSectionHeader')"
      :contents="trimmedOverview" />
  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import { getCurrentChannelObject } from 'kolibri.coreVue.vuex.getters';
  import pageHeader from '../page-header';
  import contentCardCarousel from '../content-card-carousel';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  const mobileCardNumber = 3;

  export default {
    $trNameSpace: 'learnPageIndex',
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
    },
    computed: {
      isMobile() {
        return this.windowSize.breakpoint <= 2;
      },
      trimmedResume() {
        if (this.isMobile) {
          return this.recommendations.resume.slice(0, mobileCardNumber);
        }
        return this.recommendations.resume.slice(0, mobileCardNumber);
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
