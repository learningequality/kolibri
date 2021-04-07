<template>

  <div>

    <h1 class="visuallyhidden">
      {{ learnString('recommendedLabel') }}
    </h1>

    <template v-if="popular.length">
      <ContentCardGroupHeader
        :header="learnString('mostPopularLabel')"
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
        :header="learnString('nextStepsLabel')"
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
        :header="learnString('resumeLabel')"
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
  import uniq from 'lodash/uniq';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeProgressResource } from 'kolibri.resources';
  import { PageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';
  import ContentCardGroupCarousel from './ContentCardGroupCarousel';
  import ContentCardGroupGrid from './ContentCardGroupGrid';
  import ContentCardGroupHeader from './ContentCardGroupHeader';

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
    mixins: [commonLearnStrings, responsiveWindowMixin],
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
    created() {
      if (this.$store.getters.isUserLoggedIn) {
        const contentNodeIds = uniq(
          [...this.trimmedNextSteps, ...this.trimmedPopular, ...this.trimmedResume].map(
            ({ id }) => id
          )
        );

        if (contentNodeIds.length > 0) {
          ContentNodeProgressResource.fetchCollection({ getParams: { ids: contentNodeIds } }).then(
            progresses => {
              this.$store.commit('recommended/SET_RECOMMENDED_NODES_PROGRESS', progresses);
            }
          );
        }
      }
    },
    methods: {
      genContentLink(id, isLeaf) {
        return {
          name: isLeaf ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
          params: { id },
          query: {
            last: this.$store.state.pageName,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
