<template>

  <KPageContainer>
    <!-- isUserLoggedIn is used here to check if user is logged in or not.-->
    <!-- If in guest mode, do not show progress icon at all-->
    <PageHeader
      :title="content.title"
      :progress="isUserLoggedIn ? progress : null"
      dir="auto"
      :contentType="content.kind"
    />
    <CoachContentLabel
      class="coach-content-label"
      :value="content.coach_content ? 1 : 0"
      :isTopic="isTopic"
    />
    <template v-if="sessionReady">
      <KContentRenderer
        v-if="!content.assessment"
        class="content-renderer"
        :kind="content.kind"
        :lang="content.lang"
        :files="content.files"
        :options="content.options"
        :available="content.available"
        :duration="content.duration"
        :extraFields="extraFields"
        :progress="summaryProgress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="summaryTimeSpent"
        @startTracking="startTracking"
        @stopTracking="stopTracking"
        @updateProgress="updateProgress"
        @addProgress="addProgress"
        @updateContentState="updateContentState"
        @navigateTo="navigateTo"
        @error="onError"
      />

      <AssessmentWrapper
        v-else
        :id="content.id"
        class="content-renderer"
        :kind="content.kind"
        :files="content.files"
        :lang="content.lang"
        :randomize="content.randomize"
        :masteryModel="content.masteryModel"
        :assessmentIds="content.assessmentIds"
        :channelId="channelId"
        :available="content.available"
        :extraFields="extraFields"
        :progress="summaryProgress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="summaryTimeSpent"
        @startTracking="startTracking"
        @stopTracking="stopTracking"
        @updateProgress="updateExerciseProgress"
        @updateContentState="updateContentState"
      />
    </template>
    <KCircularLoader v-else />

    <!-- TODO consolidate this metadata table with coach/lessons -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p dir="auto" v-html="description"></p>


    <section class="metadata">
      <!-- TODO: RTL - Do not interpolate strings -->
      <p v-if="content.author">
        {{ $tr('author', { author: content.author }) }}
      </p>
      <p v-if="licenseShortName">
        {{ $tr('license', { license: licenseShortName }) }}

        <template v-if="licenseDescription">
          <KIconButton
            :icon="licenceDescriptionIsVisible ? 'chevronUp' : 'chevronDown'"
            :ariaLabel="$tr('toggleLicenseDescription')"
            size="small"
            type="secondary"
            @click="licenceDescriptionIsVisible = !licenceDescriptionIsVisible"
          />
          <div v-if="licenceDescriptionIsVisible" dir="auto" class="license-details">
            <p class="license-details-name">
              {{ licenseLongName }}
            </p>
            <p>{{ licenseDescription }}</p>
          </div>
        </template>
      </p>

      <p v-if="content.license_owner">
        {{ $tr('copyrightHolder', { copyrightHolder: content.license_owner }) }}
      </p>
    </section>

    <div>

      <DownloadButton
        v-if="canDownload"
        :files="downloadableFiles"
        :nodeTitle="content.title"
        class="download-button"
      />

      <KButton
        v-if="canShare"
        :text="$tr('shareFile')"
        class="share-button"
        @click="launchIntent()"
      />

    </div>

    <slot name="below_content">
      <template v-if="content.next_content">
        <h2>{{ $tr('nextResource') }}</h2>
        <ContentCardGroupCarousel
          :genContentLink="genContentLink"
          :contents="[content.next_content]"
        />
      </template>
      <template v-if="showRecommended">
        <h2>{{ learnString('recommendedLabel') }}</h2>
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

  </KPageContainer>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { ContentNodeResource } from 'kolibri.resources';
  import router from 'kolibri.coreVue.router';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import DownloadButton from 'kolibri.coreVue.components.DownloadButton';
  import { isEmbeddedWebView } from 'kolibri.utils.browserInfo';
  import { shareFile } from 'kolibri.utils.appCapabilities';
  import markdownIt from 'markdown-it';
  import {
    licenseShortName,
    licenseLongName,
    licenseDescriptionForConsumer,
  } from 'kolibri.utils.licenseTranslations';
  import { PageNames, PageModes, ClassesPageNames } from '../constants';
  import { updateContentNodeProgress } from '../modules/coreLearn/utils';
  import PageHeader from './PageHeader';
  import ContentCardGroupCarousel from './ContentCardGroupCarousel';
  import AssessmentWrapper from './AssessmentWrapper';
  import MasteredSnackbars from './MasteredSnackbars';
  import { lessonResourceViewerLink } from './classes/classPageLinks';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'ContentPage',
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
    components: {
      CoachContentLabel,
      PageHeader,
      ContentCardGroupCarousel,
      DownloadButton,
      AssessmentWrapper,
      MasteredSnackbars,
    },
    mixins: [commonLearnStrings],
    data() {
      return {
        wasIncomplete: false,
        licenceDescriptionIsVisible: false,
        sessionReady: false,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'facilityConfig', 'pageMode', 'currentUserId']),
      ...mapState(['pageName']),
      ...mapState('topicsTree', ['content', 'channel', 'recommended']),
      ...mapState('topicsTree', {
        contentId: state => state.content.content_id,
        contentNodeId: state => state.content.id,
        channelId: state => state.content.channel_id,
      }),
      ...mapState({
        masteryAttempts: state => state.core.logging.mastery.totalattempts,
        summaryProgress: state => state.core.logging.summary.progress,
        summaryTimeSpent: state => state.core.logging.summary.time_spent,
        sessionProgress: state => state.core.logging.session.progress,
        extraFields: state => state.core.logging.summary.extra_fields,
        fullName: state => state.core.session.full_name,
      }),
      isTopic() {
        return this.content.kind === ContentNodeKinds.TOPIC;
      },
      canDownload() {
        if (this.facilityConfig.show_download_button_in_learn && this.content) {
          return (
            this.downloadableFiles.length &&
            this.content.kind !== ContentNodeKinds.EXERCISE &&
            !isEmbeddedWebView
          );
        }
        return false;
      },
      canShare() {
        let supported_types = ['mp4', 'mp3', 'pdf', 'epub'];
        return shareFile && supported_types.includes(this.primaryFile.extension);
      },
      description() {
        if (this.content && this.content.description) {
          const md = new markdownIt({ breaks: true });
          return md.render(this.content.description);
        }
        return '';
      },
      recommendedText() {
        return this.learnString('recommendedLabel');
      },
      progress() {
        if (this.isUserLoggedIn) {
          // if there no attempts for this exercise, there is no progress
          if (this.content.kind === ContentNodeKinds.EXERCISE && this.masteryAttempts === 0) {
            return undefined;
          }
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
        return this.content.files.filter(file => !file.preset.endsWith('thumbnail'));
      },
      primaryFile() {
        return this.content.files.filter(file => !file.preset.supplementary)[0];
      },
      primaryFilename() {
        return `${this.primaryFile.checksum}.${this.primaryFile.extension}`;
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
      licenseShortName() {
        return licenseShortName(this.content.license_name);
      },
      licenseLongName() {
        return licenseLongName(this.content.license_name);
      },
      licenseDescription() {
        return licenseDescriptionForConsumer(
          this.content.license_name,
          this.content.license_description
        );
      },
    },
    created() {
      return this.initSessionAction({
        channelId: this.channelId,
        contentId: this.contentId,
        contentKind: this.content.kind,
      }).then(() => {
        this.sessionReady = true;
        this.setWasIncomplete();
      });
    },
    beforeDestroy() {
      this.stopTracking();
    },
    methods: {
      ...mapActions({
        initSessionAction: 'initContentSession',
        updateProgressAction: 'updateProgress',
        addProgressAction: 'addProgress',
        startTracking: 'startTrackingProgress',
        stopTracking: 'stopTrackingProgress',
        updateContentNodeState: 'updateContentState',
      }),
      setWasIncomplete() {
        this.wasIncomplete = this.progress < 1;
      },
      updateProgress(progressPercent, forceSave = false) {
        this.updateProgressAction({ progressPercent, forceSave }).then(updatedProgressPercent =>
          updateContentNodeProgress(this.channelId, this.contentNodeId, updatedProgressPercent)
        );
        this.$emit('updateProgress', progressPercent);
      },
      addProgress(progressPercent, forceSave = false) {
        this.addProgressAction({ progressPercent, forceSave }).then(updatedProgressPercent =>
          updateContentNodeProgress(this.channelId, this.contentNodeId, updatedProgressPercent)
        );
        this.$emit('addProgress', progressPercent);
      },
      updateExerciseProgress(progressPercent) {
        this.$emit('updateProgress', progressPercent);
      },
      updateContentState(contentState, forceSave = true) {
        this.updateContentNodeState({ contentState, forceSave });
      },
      navigateTo(message) {
        let id = message.nodeId;
        return ContentNodeResource.fetchModel({ id })
          .then(contentNode => {
            router.push(this.genContentLink(contentNode.id, contentNode.is_leaf));
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
      markAsComplete() {
        this.wasIncomplete = false;
      },
      genContentLink(id, isLeaf) {
        return {
          name: isLeaf ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
          params: { id },
        };
      },
      launchIntent() {
        return shareFile({
          filename: this.primaryFilename,
          message: this.$tr('shareMessage', {
            title: this.content.title,
            topic: this.content.breadcrumbs.slice(-1)[0].title,
            copyrightHolder: this.content.license_owner,
          }),
        }).catch(() => {});
      },
      onError(error) {
        this.$store.dispatch('handleApiError', error);
      },
    },
    $trs: {
      author: {
        message: 'Author: {author}',
        context:
          'Indicates who is the author of that specific learning resource. For example, "Author: Learning Equality".',
      },
      license: {
        message: 'License: {license}',
        context:
          'Indicates the type of license of that specific learning resource. For example, "License: CC BY-NC-ND".\n',
      },
      toggleLicenseDescription: {
        message: 'Toggle license description',
        context:
          'Describes the arrow which a learner can select to view more information about the type of license that a resource has.',
      },
      copyrightHolder: {
        message: 'Copyright holder: {copyrightHolder}',
        context:
          'Indicates who holds the copyright of that specific learning resource. For example, "Copyright holder: Ubongo Media".',
      },
      shareMessage: {
        message: '"{title}" (in "{topic}"), from {copyrightHolder}',
        context: 'Refers to a specific learning resource. Only translate "in" and "from".',
      },
      nextResource: {
        message: 'Next resource',
        context:
          "Indicates the next learning resource that the learner should go to once they've finished the current one.",
      },
      documentTitle: {
        message: '{ contentTitle } - { channelTitle }',
        context: 'DO NOT TRANSLATE.',
      },
      shareFile: {
        message: 'Share',
        context: 'Option to share a specific file from a learning resource.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content-renderer {
    // Needs to be one less than the ScrollingHeader's z-index of 4
    z-index: 3;
  }

  .coach-content-label {
    margin: 8px 0;
  }

  .metadata {
    font-size: smaller;
  }

  .download-button,
  .share-button {
    display: inline-block;
    margin: 16px 16px 0 0;
  }

  .license-details {
    margin-bottom: 24px;
    margin-left: 16px;
  }

  .license-details-name {
    font-weight: bold;
  }

</style>
