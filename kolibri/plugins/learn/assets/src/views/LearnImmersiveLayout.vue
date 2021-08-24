<template>

  <div
    v-if="!loading"
    ref="mainWrapper"
    class="main-wrapper"
  >

    <div v-if="blockDoubleClicks" class="click-mask"></div>
    <SkipNavigationLink />
    <LearningActivityBar
      :resourceTitle="resourceTitle"
      :learningActivities="mappedLearningActivities"
      :isLessonContext="true"
      :isBookmarked="true"
      :allowMarkComplete="false"
      data-test="learningActivityBar"
      @navigateBack="navigateBack"
    />
    <KLinearLoader
      v-if="loading"
      class="loader"
      type="indeterminate"
      :delay="false"
    />
    <KPageContainer v-if="notAuthorized">
      <AuthMessage
        :authorizedRole="authorizedRole"
        :header="authorizationErrorHeader"
        :details="authorizationErrorDetails"
      />
    </KPageContainer>
    <KPageContainer v-else-if="error">
      <AppError />
    </KPageContainer>

    <div
      v-else
      id="main"
      role="main"
      tabindex="-1"
      class="main"
    >
      <ContentPage
        class="content"
        data-test="contentPage"
      />
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import { LearningActivities } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import SkipNavigationLink from '../../../../../../kolibri/core/assets/src/views/SkipNavigationLink';
  import AppError from '../../../../../../kolibri/core/assets/src/views/AppError';
  import ContentPage from './ContentPage';
  import LearningActivityBar from './LearningActivityBar';

  const mapOldContentTypesToLearningActivities = {
    audio: LearningActivities.LISTEN,
    document: LearningActivities.READ,
    html5: LearningActivities.EXPLORE,
    video: LearningActivities.WATCH,
  };
  export default {
    name: 'LearnImmersiveLayout',
    metaInfo() {
      return {
        // Use arrow function to bind $tr to this component
        titleTemplate: title => {
          if (this.error) {
            return this.$tr('kolibriTitleMessage', { title: this.$tr('errorPageTitle') });
          }
          if (!title) {
            // If no child component sets title, it reads 'Kolibri'
            return this.coreString('kolibriLabel');
          }
          // If child component sets title, it reads 'Child Title - Kolibri'
          return this.$tr('kolibriTitleMessage', { title });
        },
        title: this.pageTitle,
      };
    },
    components: {
      AppError,
      AuthMessage,
      ContentPage,
      LearningActivityBar,
      SkipNavigationLink,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    props: {
      content: {
        type: Object,
        required: false,
        default: null,
      },
      // AUTHORIZATION SPECIFIC
      authorized: {
        type: Boolean,
        required: false,
        default: true,
      },
      authorizedRole: {
        type: String,
        default: null,
      },
      // link to where the 'back' button should go
      back: {
        type: Object,
        required: true,
        default: null,
      },
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
        loading: state => state.core.loading,
        blockDoubleClicks: state => state.core.blockDoubleClicks,
      }),
      notAuthorized() {
        // catch "not authorized" error, display AuthMessage
        if (
          this.error &&
          this.error.response &&
          this.error.response.status &&
          this.error.response.status == 403
        ) {
          return true;
        }
        return !this.authorized;
      },
      resourceTitle() {
        return this.content ? this.content.title : '';
      },
      mappedLearningActivities() {
        let learningActivities = [];
        if (this.content && this.content.kind) {
          if (Object.values(LearningActivities).includes(this.content.kind)) {
            learningActivities.push(this.content.kind);
          } else {
            // otherwise reassign the old content types to the new metadata
            learningActivities.push(mapOldContentTypesToLearningActivities[this.content.kind]);
          }
        }
        return learningActivities;
      },
    },
    methods: {
      navigateBack() {
        // return to previous page using the route object set through props
        this.$router.push(this.back);
      },
    },
    $trs: {
      kolibriTitleMessage: {
        message: '{ title } - Kolibri',
        context: 'DO NOT TRANSLATE.',
      },
      errorPageTitle: {
        message: 'Error',
        context:
          "When Kolibri throws an error, this is the text that's used as the title of the error page. The description of the error follows below.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .main-wrapper {
    display: inline-block;
    width: 100%;
    background-color: white;

    @media print {
      /* Without this, things won't print correctly
       *  - Firefox: Tables will get cutoff
       *  - Chrome: Table header won't repeat correctly on each page
       */
      display: block;
    }
  }

  // When focused by SkipNavigationLink, don't outline non-buttons/links
  /deep/ [tabindex='-1'] {
    outline-style: none !important;
  }

  .click-mask {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 24;
    width: 100%;
    height: 100%;
  }

  .loader {
    position: fixed;
    right: 0;
    left: 0;
  }

</style>
