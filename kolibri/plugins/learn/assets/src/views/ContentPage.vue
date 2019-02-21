<template>

  <div>

    <PageHeader :title="content.title" dir="auto" />
    <CoachContentLabel
      class="coach-content-label"
      :value="content.coach_content ? 1 : 0"
      :isTopic="isTopic"
    />

    <ContentRenderer
      v-if="!content.assessment"
      :id="content.id"
      class="content-renderer"
      :kind="content.kind"
      :lang="content.lang"
      :files="content.files"
      :contentId="contentId"
      :channelId="channelId"
      :available="content.available"
      :extraFields="extraFields"
      :initSession="initSession"
      @sessionInitialized="setWasIncomplete"
      @startTracking="startTracking"
      @stopTracking="stopTracking"
      @updateProgress="updateProgress"
      @updateContentState="updateContentState"
    />

    <AssessmentWrapper
      v-else
      :id="content.id"
      ref="assessmentWrapper"
      class="content-renderer"
      :kind="content.kind"
      :files="content.files"
      :lang="content.lang"
      :randomize="content.randomize"
      :masteryModel="content.masteryModel"
      :assessmentIds="content.assessmentIds"
      :contentId="contentId"
      :channelId="channelId"
      :available="content.available"
      :extraFields="extraFields"
      :initSession="initSession"
      @sessionInitialized="setWasIncomplete"
      @startTracking="startTracking"
      @stopTracking="stopTracking"
      @updateProgress="updateExerciseProgress"
      @updateContentState="updateContentState"
    />

    <div v-if="content.assessment" class="panic">
      <button @click="panic">
        😩
      </button>
    </div>

    <!-- TODO consolidate this metadata table with coach/lessons -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p dir="auto" v-html="description"></p>


    <section class="metadata">
      <!-- TODO: RTL - Do not interpolate strings -->
      <p v-if="content.author">
        {{ $tr('author', {author: content.author}) }}
      </p>

      <p v-if="content.license_name">
        {{ $tr('license', {license: content.license_name}) }}

        <template v-if="content.license_description">
          <UiIconButton
            :ariaLabel="$tr('toggleLicenseDescription')"
            size="small"
            type="secondary"
            @click="licenceDescriptionIsVisible = !licenceDescriptionIsVisible"
          >
            <mat-svg v-if="licenceDescriptionIsVisible" name="expand_less" category="navigation" />
            <mat-svg v-else name="expand_more" category="navigation" />
          </UiIconButton>
          <p v-if="licenceDescriptionIsVisible" dir="auto">
            {{ content.license_description }}
          </p>
        </template>
      </p>

      <p v-if="content.license_owner">
        {{ $tr('copyrightHolder', {copyrightHolder: content.license_owner}) }}
      </p>
    </section>

    <DownloadButton
      v-if="canDownload"
      :files="downloadableFiles"
      class="download-button"
    />

    <slot name="below_content">
      <template v-if="progress >= 1 && content.next_content">
        <h2>{{ $tr('nextResource') }}</h2>
        <ContentCardGroupCarousel
          :genContentLink="genContentLink"
          :contents="[content.next_content]"
        />
      </template>
      <template v-if="showRecommended">
        <h2>{{ $tr('recommended') }}</h2>
        <ContentCardGroupCarousel
          :genContentLink="genContentLink"
          :header="recommendedText"
          :contents="recommended"
        />
      </template>
    </slot>

    <MasteredSnackbars
      v-if="progress >= 1 && wasIncomplete"
      :nextContent="content.next_content"
      :nextContentLink="nextContentLink"
      @close="markAsComplete"
    />

  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import DownloadButton from 'kolibri.coreVue.components.DownloadButton';
  import { isAndroidWebView } from 'kolibri.utils.browser';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import markdownIt from 'markdown-it';
  import { httpClient } from 'kolibri.client';
  import { PageNames, PageModes, ClassesPageNames } from '../constants';
  import { updateContentNodeProgress } from '../modules/coreLearn/utils';
  import PageHeader from './PageHeader';
  import ContentCardGroupCarousel from './ContentCardGroupCarousel';
  import AssessmentWrapper from './AssessmentWrapper';
  import MasteredSnackbars from './MasteredSnackbars';
  import { lessonResourceViewerLink } from './classes/classPageLinks';

  export default {
    name: 'ContentPage',
    $trs: {
      recommended: 'Recommended',
      author: 'Author: {author}',
      license: 'License: {license}',
      toggleLicenseDescription: 'Toggle license description',
      copyrightHolder: 'Copyright holder: {copyrightHolder}',
      nextResource: 'Next resource',
      documentTitle: '{ contentTitle } - { channelTitle }',
    },
    components: {
      CoachContentLabel,
      PageHeader,
      ContentCardGroupCarousel,
      ContentRenderer,
      DownloadButton,
      AssessmentWrapper,
      MasteredSnackbars,
      UiIconButton,
    },
    metaInfo() {
      // Do not overwrite metaInfo of LessonResourceViewer
      if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
        return {};
      }
      return {
        title: this.$tr('documentTitle', {
          contentTitle: this.content.title,
          channelTitle: this.channel.title,
        }),
      };
    },
    data() {
      return {
        wasIncomplete: false,
        licenceDescriptionIsVisible: false,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'facilityConfig', 'contentPoints', 'pageMode']),
      ...mapState(['pageName']),
      ...mapState('topicsTree', ['content', 'channel', 'recommended']),
      ...mapState('topicsTree', {
        contentId: state => state.content.content_id,
        contentNodeId: state => state.content.id,
        channelId: state => state.content.channel_id,
      }),
      ...mapState({
        summaryProgress: state => state.core.logging.summary.progress,
        sessionProgress: state => state.core.logging.session.progress,
        extraFields: state => state.core.logging.summary.extra_fields,
      }),
      isTopic() {
        return this.content.kind === ContentNodeKinds.TOPIC;
      },
      canDownload() {
        if (this.facilityConfig.showDownloadButtonInLearn && this.content) {
          return (
            this.downloadableFiles.length &&
            this.content.kind !== ContentNodeKinds.EXERCISE &&
            !isAndroidWebView()
          );
        }
        return false;
      },
      description() {
        if (this.content && this.content.description) {
          const md = new markdownIt('zero', { breaks: true });
          return md.render(this.content.description);
        }
        return '';
      },
      recommendedText() {
        return this.$tr('recommended');
      },
      progress() {
        if (this.isUserLoggedIn) {
          return this.summaryProgress;
        }
        return this.sessionProgress;
      },
      showRecommended() {
        return (
          this.recommended && this.recommended.length && this.pageMode === PageModes.RECOMMENDED
        );
      },
      downloadableFiles() {
        return this.content.files.filter(file => file.preset !== 'Thumbnail');
      },
      nextContentLink() {
        // HACK Use a the Resource Viewer Link instead
        if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          return lessonResourceViewerLink(Number(this.$route.params.resourceNumber) + 1);
        }
        return {
          name:
            this.content.next_content.kind === ContentNodeKinds.TOPIC
              ? PageNames.TOPICS_TOPIC
              : PageNames.TOPICS_CONTENT,
          params: { id: this.content.next_content.id },
        };
      },
    },
    beforeDestroy() {
      this.stopTracking();
    },
    methods: {
      ...mapActions({
        initSessionAction: 'initContentSession',
        updateProgressAction: 'updateProgress',
        startTracking: 'startTrackingProgress',
        stopTracking: 'stopTrackingProgress',
        updateContentNodeState: 'updateContentState',
      }),
      ...mapActions(['createSnackbar']),
      setWasIncomplete() {
        this.wasIncomplete = this.progress < 1;
      },
      initSession() {
        return this.initSessionAction({
          channelId: this.channelId,
          contentId: this.contentId,
          contentKind: this.content.kind,
        });
      },
      updateProgress(progressPercent, forceSave = false) {
        this.updateProgressAction({ progressPercent, forceSave }).then(updatedProgressPercent =>
          updateContentNodeProgress(this.channelId, this.contentNodeId, updatedProgressPercent)
        );
        this.$emit('updateProgress', progressPercent);
      },
      updateExerciseProgress(progressPercent) {
        this.$emit('updateProgress', progressPercent);
      },
      updateContentState(contentState, forceSave = true) {
        this.updateContentNodeState({ contentState, forceSave });
      },
      markAsComplete() {
        this.wasIncomplete = false;
      },
      genContentLink(id, kind) {
        return {
          name: kind === ContentNodeKinds.TOPIC ? PageNames.TOPICS_TOPIC : PageNames.TOPICS_CONTENT,
          params: { id },
        };
      },
      panic() {
        const values = {
          channel_id: this.channelId,
          content_id: this.contentId,
          node_id: this.content.id,
          question_id: this.$refs.assessmentWrapper.itemId,
        };
        httpClient({
          path: '/api/logger/panic/',
          method: 'POST',
          entity: values,
        }).then(() => {
          this.createSnackbar({
            text: 'ok, sorry',
            autoDismiss: true,
          });
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .coach-content-label {
    margin: 8px 0;
  }

  .content-renderer {
    margin-top: 24px;
  }

  .metadata {
    font-size: smaller;
  }

  .download-button {
    display: block;
  }

  .panic {
    height: 250px;
    text-align: center;
    button {
      padding: 48px;
      font-size: 68px;
      font-weight: bold;
      text-shadow: 0 7px 9px rgba(0, 0, 0, 0.2), 0 14px 21px rgba(0, 0, 0, 0.14),
        0 5px 26px rgba(0, 0, 0, 0.12);
      transition: all 0.1s ease;

      &:hover {
        font-size: 128px;
        text-shadow: 0 11px 15px rgba(0, 0, 0, 0.2), 0 24px 38px rgba(0, 0, 0, 0.14),
          0 9px 46px rgba(0, 0, 0, 0.12);
      }
    }
  }

</style>
