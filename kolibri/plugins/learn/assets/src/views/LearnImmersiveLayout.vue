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
      :isLessonContext="false"
      :isBookmarked="bookmark ? true : bookmark"
      :isCoachContent="isCoachContent"
      :contentProgress="contentProgress"
      :allowMarkComplete="allowMarkComplete"
      :contentKind="content.kind"
      data-test="learningActivityBar"
      @navigateBack="navigateBack"
      @toggleBookmark="toggleBookmark"
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
        :content="content"
        :contentId="content.content_id"
        :channelId="content.channel_id"
        :contentKind="content.kind"
      />
    </div>
    <GlobalSnackbar />
  </div>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import {
    LearningActivities,
    ContentKindsToLearningActivitiesMap,
  } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import GlobalSnackbar from '../../../../../../kolibri/core/assets/src/views/GlobalSnackbar';
  import SkipNavigationLink from '../../../../../../kolibri/core/assets/src/views/SkipNavigationLink';
  import AppError from '../../../../../../kolibri/core/assets/src/views/AppError';
  import ContentPage from './ContentPage';
  import LearningActivityBar from './LearningActivityBar';

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
      GlobalSnackbar,
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
    data() {
      return {
        bookmark: null,
      };
    },
    computed: {
      ...mapGetters(['currentUserId']),
      ...mapState({
        contentProgress: state => state.core.logging.summary.progress,
        error: state => state.core.error,
        loading: state => state.core.loading,
        blockDoubleClicks: state => state.core.blockDoubleClicks,
      }),
      ...mapState('topicsTree', {
        isCoachContent: state => (state.content.coach_content ? 1 : 0),
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
      allowMarkComplete() {
        // TODO: This should be determined by some other means. Content metadata?
        const DEV_ONLY = process.env.NODE_ENV !== 'production';
        return DEV_ONLY;
      },
      mappedLearningActivities() {
        let learningActivities = [];
        if (this.content && this.content.kind) {
          if (Object.values(LearningActivities).includes(this.content.kind)) {
            learningActivities.push(this.content.kind);
          } else {
            // otherwise reassign the old content types to the new metadata
            learningActivities.push(ContentKindsToLearningActivitiesMap[this.content.kind]);
          }
        }
        return learningActivities;
      },
    },
    created() {
      client({
        method: 'get',
        url: urls['kolibri:core:bookmarks-list'](),
        params: { contentnode_id: this.content.id },
      }).then(response => {
        this.bookmark = response.data[0] || false;
      });
    },
    methods: {
      navigateBack() {
        // return to previous page using the route object set through props
        this.$router.push(this.back);
      },
      toggleBookmark() {
        if (this.bookmark) {
          client({
            method: 'delete',
            url: urls['kolibri:core:bookmarks_detail'](this.bookmark.id),
          }).then(() => {
            this.bookmark = false;
          });
        } else if (this.bookmark === false) {
          client({
            method: 'post',
            url: urls['kolibri:core:bookmarks-list'](),
            data: {
              contentnode_id: this.content.id,
              user: this.currentUserId,
            },
          }).then(response => {
            this.bookmark = response.data;
          });
        }
      },
    },
    $trs: {
      kolibriTitleMessage: {
        message: '{ title } - Kolibri',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
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
