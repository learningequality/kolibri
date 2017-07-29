<template>

  <div>
    <page-header :title="$tr('pageHeader')">
      <mat-svg slot="icon" category="action" name="home"/>
    </page-header>
    <content-card-carousel
      v-if="recommendations.resume.length"
      :gen-link="genLink"
      :contents="recommendations.resume"
      :header="$tr('resumeSectionHeader')"
      :subheader="$tr('resumeSectionSubHeader', {numOfItems: recommendations.resume.length})"/>
    <content-card-carousel
      v-if="recommendations.nextSteps.length"
      :gen-link="genLink"
      :contents="recommendations.nextSteps"
      :header="$tr('suggestedNextStepsSectionHeader')"
      :subheader="$tr('suggestedNextStepsSectionSubHeader', {numOfItems: recommendations.nextSteps.length})"/>
    <content-card-carousel
      v-if="recommendations.popular.length"
      :gen-link="genLink"
      :contents="recommendations.popular"
      :header="$tr('popularSectionHeader')"
      :subheader="$tr('popularSectionSubHeader', {numOfItems: recommendations.popular.length})"/>
    <content-card-carousel
      v-if="all.content.length"
      :showViewAll="true"
      :gen-link="genLink"
      :header="$tr('overviewSectionHeader')"
      :contents="all.content" />
  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import { getCurrentChannelObject } from 'kolibri.coreVue.vuex.getters';
  import pageHeader from '../page-header';
  import contentCardCarousel from '../content-card-carousel';
  export default {
    name: 'learnPageIndex',
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
    components: {
      pageHeader,
      contentCardCarousel,
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
