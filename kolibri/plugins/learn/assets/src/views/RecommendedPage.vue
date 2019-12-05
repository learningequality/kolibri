<template>

  <div>

    <h1 class="visuallyhidden">
      {{ learnString('recommendedLabel') }}
    </h1>

    <template v-if="popular.length">
      <ContentCardGroupHeader
        :header="$tr('popularSectionHeader')"
        :viewMorePageLink="popularPageLink"
        :showViewMore="popular.length > trimmedPopular.length"
      />
      <ContentCardGroupGrid
        v-if="windowIsSmall"
        :genContentLink="genContentLink"
        :contents="trimmedPopular"
      />
      <ContentCardGroupCarousel
        v-else
        :genContentLink="genContentLink"
        :contents="trimmedPopular"
      />
    </template>

    <template v-if="nextSteps.length">
      <ContentCardGroupHeader
        :header="$tr('suggestedNextStepsSectionHeader')"
        :viewMorePageLink="nextStepsPageLink"
        :showViewMore="nextSteps.length > trimmedNextSteps.length"
      />
      <ContentCardGroupGrid
        v-if="windowIsSmall"
        :genContentLink="genContentLink"
        :contents="trimmedNextSteps"
      />
      <ContentCardGroupCarousel
        v-else
        :genContentLink="genContentLink"
        :contents="trimmedNextSteps"
      />
    </template>

    <template v-if="resume.length">
      <ContentCardGroupHeader
        :header="learnIndexString('documentTitleForResume')"
        :viewMorePageLink="resumePageLink"
        :showViewMore="resume.length > trimmedResume.length"
      />
      <ContentCardGroupGrid
        v-if="windowIsSmall"
        :genContentLink="genContentLink"
        :contents="trimmedResume"
      />
      <ContentCardGroupCarousel
        v-else
        :genContentLink="genContentLink"
        :contents="trimmedResume"
      />
    </template>

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';
  import ContentCardGroupCarousel from './ContentCardGroupCarousel';
  import ContentCardGroupGrid from './ContentCardGroupGrid';
  import ContentCardGroupHeader from './ContentCardGroupHeader';
  import learnIndexStrings from './learnIndexStrings';

  const mobileCarouselLimit = 3;
  const desktopCarouselLimit = 15;

  export default {
    name: 'RecommendedPage',
    metaInfo() {
      return {
        title: this.learnString('learnLabel'),
      };
    },
    components: {
      ContentCardGroupCarousel,
      ContentCardGroupGrid,
      ContentCardGroupHeader,
    },
    mixins: [commonLearnStrings, responsiveWindowMixin, learnIndexStrings],
    computed: {
      ...mapState('recommended', ['nextSteps', 'popular', 'resume']),
      carouselLimit() {
        return this.windowIsSmall ? mobileCarouselLimit : desktopCarouselLimit;
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
    },
    methods: {
      genContentLink(id, kind) {
        return {
          name: kind === ContentNodeKinds.TOPIC ? PageNames.TOPICS_TOPIC : PageNames.TOPICS_CONTENT,
          params: { id },
          query: {
            last: this.$store.state.pageName,
          },
        };
      },
    },
    $trs: {
      popularSectionHeader: 'Most popular',
      suggestedNextStepsSectionHeader: 'Next steps',
    },
  };

</script>


<style lang="scss" scoped></style>
