<template>

  <div>
    <KBreadcrumbs :items="breadcrumbItems" />
    <h1>{{ header }}</h1>
    <ContentCardGroupGrid
      :contents="recommendations"
      :genContentLink="genContentLink"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { ContentNodeProgressResource } from 'kolibri.resources';
  import { PageNames } from '../constants';
  import ContentCardGroupGrid from './ContentCardGroupGrid';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'RecommendedSubpage',
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
    components: {
      ContentCardGroupGrid,
    },
    mixins: [commonLearnStrings],
    computed: {
      ...mapState(['pageName']),
      ...mapState('recommended', ['nextSteps', 'popular', 'resume']),
      documentTitle() {
        switch (this.pageName) {
          case PageNames.RECOMMENDED_POPULAR:
            return this.learnString('popularLabel');
          case PageNames.RECOMMENDED_RESUME:
            return this.learnString('resumeLabel');
          case PageNames.RECOMMENDED_NEXT_STEPS:
            return this.learnString('nextStepsLabel');
          default:
            return '';
        }
      },
      header() {
        switch (this.pageName) {
          case PageNames.RECOMMENDED_POPULAR:
            return this.learnString('mostPopularLabel');
          case PageNames.RECOMMENDED_RESUME:
            return this.learnString('resumeLabel');
          case PageNames.RECOMMENDED_NEXT_STEPS:
            return this.learnString('nextStepsLabel');
          default:
            return null;
        }
      },
      breadcrumbItems() {
        return [
          {
            text: this.learnString('recommendedLabel'),
            link: this.$router.getRoute(PageNames.RECOMMENDED),
          },
          {
            text: this.header,
          },
        ];
      },
      recommendations() {
        switch (this.pageName) {
          case PageNames.RECOMMENDED_POPULAR:
            return this.popular;
          case PageNames.RECOMMENDED_RESUME:
            return this.resume;
          case PageNames.RECOMMENDED_NEXT_STEPS:
            return this.nextSteps;
          default:
            return [];
        }
      },
    },
    created() {
      if (this.$store.getters.isUserLoggedIn) {
        if (this.recommendations.length > 0) {
          for (let i = 0; i < this.recommendations.length; i += 50) {
            ContentNodeProgressResource.fetchCollection({
              getParams: { ids: this.recommendations.slice(i, i + 50).map(({ id }) => id) },
            }).then(progresses => {
              this.$store.commit('recommended/SET_RECOMMENDED_NODES_PROGRESS', progresses);
            });
          }
        }
      }
    },
    methods: {
      genContentLink(id, isLeaf) {
        const pageName = isLeaf ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC;
        return this.$router.getRoute(pageName, { id }, { last: this.pageName });
      },
    },
  };

</script>


<style lang="scss" scoped>

  h1 {
    font-size: 21px;
  }

</style>
