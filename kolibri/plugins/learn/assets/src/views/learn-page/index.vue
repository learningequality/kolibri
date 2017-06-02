<template>

  <div>
    <page-header :title="$tr('pageHeader')">
      <mat-svg slot="icon" category="action" name="home"/>
    </page-header>
    <allcontent v-if="all.content.length"/>
    <content-cards
      v-if="recommendations.popular.length"
      container="carousel"
      :contents="recommendations.popular"
      :header="$tr('popularSectionHeader')"
      :subheader="$tr('popularSectionSubHeader', {numOfItems: recommendations.popular.length})"/>
    <content-cards
      v-if="recommendations.nextSteps.length"
      container="carousel"
      :contents="recommendations.nextSteps"
      :header="$tr('suggestedNextStepsSectionHeader')"
      :subheader="$tr('suggestedNextStepsSectionSubHeader', {numOfItems: recommendations.nextSteps.length})"/>
    <content-cards
      v-if="recommendations.resume.length"
      container="carousel"
      :contents="recommendations.resume"
      :header="$tr('resumeSectionHeader')"
      :subheader="$tr('resumeSectionSubHeader', {numOfItems: recommendations.resume.length})"/>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'learnPageIndex',
    $trs: {
      pageHeader: 'Recommended',
      popularSectionHeader: 'Most popular',
      suggestedNextStepsSectionHeader: 'Next steps',
      resumeSectionHeader: 'Resume',
      popularSectionSubHeader: '{numOfItems, number} popular items',
      suggestedNextStepsSectionSubHeader: '{numOfItems, number} suggested items',
      resumeSectionSubHeader: '{numOfItems, number} itemss to be resumed',
    },
    components: {
      'page-header': require('../page-header'),
      'allcontent': require('./allcontent'),
      'content-cards': require('../content-cards'),
    },
    vuex: {
      getters: {
        all: state => state.pageState.all,
        recommendations: state => state.pageState.recommendations,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
