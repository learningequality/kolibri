<template>

  <div v-if="sessionReady" class="content">

    <KContentRenderer
      v-if="!content.assessment"
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
  </div>
  <KCircularLoader v-else />

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import { ContentNodeResource } from 'kolibri.resources';
  import router from 'kolibri.coreVue.router';
  import AssessmentWrapper from './AssessmentWrapper';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'ContentPage',
    components: {
      AssessmentWrapper,
    },
    mixins: [commonLearnStrings],
    data() {
      return {
        sessionReady: false,
      };
    },
    computed: {
      ...mapGetters(['currentUserId']),
      ...mapState('topicsTree', ['content']),
      ...mapState('topicsTree', {
        contentId: state => state.content.content_id,
        // contentNodeId: state => state.content.id,
        channelId: state => state.content.channel_id,
      }),
      // ...mapState({
      //   masteryAttempts: state => state.core.logging.mastery.totalattempts,
      //   summaryProgress: state => state.core.logging.summary.progress,
      //   summaryTimeSpent: state => state.core.logging.summary.time_spent,
      //   sessionProgress: state => state.core.logging.session.progress,
      //   extraFields: state => state.core.logging.summary.extra_fields,
      //   fullName: state => state.core.session.full_name,
      // }),
      // canDownload() {
      //   if (this.facilityConfig.show_download_button_in_learn && this.content) {
      //     return (
      //       this.downloadableFiles.length &&
      //       this.content.kind !== ContentNodeKinds.EXERCISE &&
      //       !isEmbeddedWebView
      //     );
      //   }
      //   return false;
      // },
      // canShare() {
      //   let supported_types = ['mp4', 'mp3', 'pdf', 'epub'];
      //   return shareFile && supported_types.includes(this.primaryFile.extension);
      // },
      // description() {
      //   if (this.content && this.content.description) {
      //     const md = new markdownIt({ breaks: true });
      //     return md.render(this.content.description);
      //   }
      //   return '';
      // },
      // recommendedText() {
      //   return this.learnString('recommendedLabel');
      // },
      // progress() {
      //   if (this.isUserLoggedIn) {
      //     // if there no attempts for this exercise, there is no progress
      //     if (this.content.kind === ContentNodeKinds.EXERCISE && this.masteryAttempts === 0) {
      //       return undefined;
      //     }
      //     return this.summaryProgress;
      //   }
      //   return this.sessionProgress;
      // },
      // showRecommended() {
      //   return (
      //     this.recommended && this.recommended.length && this.pageMode === PageModes.RECOMMENDED
      //   );
      // },
      // downloadableFiles() {
      //   return this.content.files.filter(file => !file.preset.endsWith('thumbnail'));
      // },
      // primaryFile() {
      //   return this.content.files.filter(file => !file.preset.supplementary)[0];
      // },
      // primaryFilename() {
      //   return `${this.primaryFile.checksum}.${this.primaryFile.extension}`;
      // },
      // nextContentLink() {
      //   // HACK Use a the Resource Viewer Link instead
      //   if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
      //     return lessonResourceViewerLink(Number(this.$route.params.resourceNumber) + 1);
      //   }
      //   return {
      //     name:
      //       this.content.next_content.kind === ContentNodeKinds.TOPIC
      //         ? PageNames.TOPICS_TOPIC
      //         : PageNames.TOPICS_CONTENT,
      //     params: { id: this.content.next_content.id },
      //   };
      // },
      // licenseShortName() {
      //   return licenseShortName(this.content.license_name);
      // },
      // licenseLongName() {
      //   return licenseLongName(this.content.license_name);
      // },
      // licenseDescription() {
      //   return licenseDescriptionForConsumer(
      //     this.content.license_name,
      //     this.content.license_description
      //   );
      // },
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
      // ...mapActions({
      //   initSessionAction: 'initContentSession',
      //   updateProgressAction: 'updateProgress',
      //   addProgressAction: 'addProgress',
      //   startTracking: 'startTrackingProgress',
      //   stopTracking: 'stopTrackingProgress',
      //   updateContentNodeState: 'updateContentState',
      // }),
      // setWasIncomplete() {
      //   this.wasIncomplete = this.progress < 1;
      // },
      // updateProgress(progressPercent, forceSave = false) {
      //   this.updateProgressAction({ progressPercent, forceSave }).then(updatedProgressPercent =>
      //     updateContentNodeProgress(this.channelId, this.contentNodeId, updatedProgressPercent)
      //   );
      //   this.$emit('updateProgress', progressPercent);
      // },
      // addProgress(progressPercent, forceSave = false) {
      //   this.addProgressAction({ progressPercent, forceSave }).then(updatedProgressPercent =>
      //     updateContentNodeProgress(this.channelId, this.contentNodeId, updatedProgressPercent)
      //   );
      //   this.$emit('addProgress', progressPercent);
      // },
      // updateExerciseProgress(progressPercent) {
      //   this.$emit('updateProgress', progressPercent);
      // },
      // updateContentState(contentState, forceSave = true) {
      //   this.updateContentNodeState({ contentState, forceSave });
      // },
      // genContentLink(id, isLeaf) {
      //   return {
      //     name: isLeaf ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
      //     params: { id },
      //   };
      // },
      // launchIntent() {
      //   return shareFile({
      //     filename: this.primaryFilename,
      //     message: this.$tr('shareMessage', {
      //       title: this.content.title,
      //       topic: this.content.breadcrumbs.slice(-1)[0].title,
      //       copyrightHolder: this.content.license_owner,
      //     }),
      //   }).catch(() => {});
      // },
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
      // markAsComplete() {
      //   this.wasIncomplete = false;
      // },
      onError(error) {
        this.$store.dispatch('handleApiError', error);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content {
    // Needs to be one less than the ScrollingHeader's z-index of 4
    z-index: 0;
  }

</style>
