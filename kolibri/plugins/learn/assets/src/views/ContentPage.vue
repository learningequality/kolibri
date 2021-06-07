<template>

  <div>

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
      <SidePanel />
    </template>
    <KCircularLoader v-else />

    <slot name="below_content">
      <template v-if="content.next_content">
        <h2>{{ $tr('nextResource') }}</h2>
        <ContentCardGroupCarousel
          :genContentLink="genContentLink"
          :contents="[content.next_content]"
        />
      </template>
    </slot>

    <CompletionModal
      v-if="progress >= 1 && wasIncomplete"
      :isUserLoggedIn="isUserLoggedIn"
      :nextContentNode="content.next_content"
      :nextContentNodeRoute="nextContentNodeRoute"
      :recommendedContentNodes="recommended"
      :genContentLink="genContentLink"
      @close="markAsComplete"
    />
    <KCircularLoader v-else />
  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { ContentNodeResource } from 'kolibri.resources';
  import router from 'kolibri.coreVue.router';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import { updateContentNodeProgress } from '../modules/coreLearn/utils';
  import PageHeader from './PageHeader';
  import AssessmentWrapper from './AssessmentWrapper';
  import { lessonResourceViewerLink } from './classes/classPageLinks';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'ContentPage',
    metaInfo() {
      // Do not overwrite metaInfo of LessonResourceViewer
      if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
        return {};
      }
      // return {
      //   title: this.$tr('documentTitle', {
      //     contentTitle: this.content.title,
      //     channelTitle: this.channel.title,
      //   }),
      // };
    },
    components: {
      CoachContentLabel,
      PageHeader,
      // ContentCardGroupCarousel,
      AssessmentWrapper,
    },
    mixins: [commonLearnStrings],
    data() {
      return {
        wasIncomplete: false,
        // licenceDescriptionIsVisible: false,
        sessionReady: false,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'facilityConfig', 'currentUserId']),
      ...mapState(['pageName']),
      ...mapState('topicsTree', {
        contentId: state => state.content.content_id,
        contentNodeId: state => state.content.id,
        channelId: state => state.content.channel_id,
        contentKind: state => state.content.kind,
      }),
      ...mapState({
        masteryAttempts: state => state.core.logging.mastery.totalattempts,
        summaryProgress: state => state.core.logging.summary.progress,
        summaryTimeSpent: state => state.core.logging.summary.time_spent,
        sessionProgress: state => state.core.logging.session.progress,
        extraFields: state => state.core.logging.summary.extra_fields,
        fullName: state => state.core.session.full_name,
      }),

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
      downloadableFiles() {
        return this.content.files.filter(file => !file.preset.endsWith('thumbnail'));
      },
      primaryFile() {
        return this.content.files.filter(file => !file.preset.supplementary)[0];
      },
      primaryFilename() {
        return `${this.primaryFile.checksum}.${this.primaryFile.extension}`;
      },
      nextContentNodeRoute() {
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
    created() {
      return this.initSessionAction({
        channelId: this.channelId,
        contentId: this.contentId,
        contentKind: this.contentKind,
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
      // TODO: markAsComplete not used but may be re-added for upcoming progress/status work
      // markAsComplete() {
      //   this.wasIncomplete = false;
      // },
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

  .content {
    z-index: 0;
    max-height: 100vh;
  }

</style>
