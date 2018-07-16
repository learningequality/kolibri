<template>

  <div>

    <h1 class="visuallyhidden">{{ $tr('recommended') }}</h1>

    <template v-if="popular.length">
      <content-card-group-header
        :header="$tr('popularSectionHeader')"
        :viewMorePageLink="popularPageLink"
        :showViewMore="popular.length > trimmedPopular.length"
      />
      <content-card-group-grid
        v-if="windowIsSmall"
        :genContentLink="genContentLink"
        :contents="trimmedPopular"
        :showContentKindFilter="false"
      />
      <content-card-group-carousel
        v-else
        :genContentLink="genContentLink"
        :contents="trimmedPopular"
      />
    </template>

    <template v-if="nextSteps.length">
      <content-card-group-header
        :header="$tr('suggestedNextStepsSectionHeader')"
        :viewMorePageLink="nextStepsPageLink"
        :showViewMore="nextSteps.length > trimmedNextSteps.length"
      />
      <content-card-group-grid
        v-if="windowIsSmall"
        :genContentLink="genContentLink"
        :contents="trimmedNextSteps"
        :showContentKindFilter="false"
      />
      <content-card-group-carousel
        v-else
        :genContentLink="genContentLink"
        :contents="trimmedNextSteps"
      />
    </template>

    <template v-if="resume.length">
      <content-card-group-header
        :header="$tr('resumeSectionHeader')"
        :viewMorePageLink="resumePageLink"
        :showViewMore="resume.length > trimmedResume.length"
      />
      <content-card-group-grid
        v-if="windowIsSmall"
        :genContentLink="genContentLink"
        :contents="trimmedResume"
        :showContentKindFilter="false"
      />
      <content-card-group-carousel
        v-else
        :genContentLink="genContentLink"
        :contents="trimmedResume"
      />
    </template>

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../constants';
  import contentCardGroupCarousel from './content-card-group-carousel';
  import contentCardGroupGrid from './content-card-group-grid';
  import contentCardGroupHeader from './content-card-group-header';

  const mobileCarouselLimit = 3;
  const desktopCarouselLimit = 15;

  export default {
    name: 'recommendedPage',
    $trs: {
      recommended: 'Recommended',
      popularSectionHeader: 'Most popular',
      suggestedNextStepsSectionHeader: 'Next steps',
      resumeSectionHeader: 'Resume',
      documentTitle: 'Learn',
    },
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      contentCardGroupCarousel,
      contentCardGroupGrid,
      contentCardGroupHeader,
    },
    mixins: [responsiveWindow],
    computed: {
      ...mapGetters({
        channels: 'getChannels',
      }),
      ...mapState({
        nextSteps: state => state.pageState.nextSteps,
        popular: state => state.pageState.popular,
        resume: state => state.pageState.resume,
      }),
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
          name:
            kind === ContentNodeKinds.TOPIC
              ? PageNames.TOPICS_TOPIC
              : PageNames.RECOMMENDED_CONTENT,
          params: { id },
        };
      },
      trimContent(content) {
        return content.slice(0, this.carouselLimit);
      },
      getChannelTitle(channel_id) {
        return this.channels.find(channel => channel.id === channel_id).title;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
