<template>

  <div>

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
        :progress="progress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="timeSpent"
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
        class="content-renderer"
        :kind="content.kind"
        :files="content.files"
        :lang="content.lang"
        :randomize="content.randomize"
        :masteryModel="content.masteryModel"
        :assessmentIds="content.assessmentIds"
        :available="content.available"
        :extraFields="extraFields"
        :progress="progress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="timeSpent"
        @startTracking="startTracking"
        @stopTracking="stopTracking"
        @updateProgress="updateProgress"
        @updateContentState="updateContentState"
      />
    </template>
    <KCircularLoader v-else />

    <CompletionModal
      v-if="progress >= 1 && wasIncomplete"
      :isUserLoggedIn="isUserLoggedIn"
      :contentNodeId="content.id"
      :lessonId="lessonId"
      @close="markAsComplete"
    />
  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { ContentNodeResource } from 'kolibri.resources';
  import router from 'kolibri.coreVue.router';
  import { updateContentNodeProgress } from '../modules/coreLearn/utils';
  import AssessmentWrapper from './AssessmentWrapper';
  import commonLearnStrings from './commonLearnStrings';
  import CompletionModal from './CompletionModal';

  export default {
    name: 'ContentPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle', {
          contentTitle: this.content.title,
          channelTitle: this.content.ancestors[0].title,
        }),
      };
    },
    components: {
      AssessmentWrapper,
      CompletionModal,
    },
    mixins: [commonLearnStrings],
    props: {
      content: {
        type: Object,
        required: true,
        validator(val) {
          return val.kind && val.content_id;
        },
      },
      // only present when the content node is being viewed as part of lesson
      lessonId: {
        type: String,
        required: false,
        default: null,
      },
    },
    data() {
      return {
        wasIncomplete: false,
        sessionReady: false,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'currentUserId']),
      ...mapState({
        progress: state => state.core.logging.progress,
        timeSpent: state => state.core.logging.time_spent,
        extraFields: state => state.core.logging.extra_fields,
        fullName: state => state.core.session.full_name,
      }),
    },
    created() {
      return this.initContentSession({
        nodeId: this.content.id,
        lessonId: this.lessonId,
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
        initContentSession: 'initContentSession',
        updateContentSession: 'updateContentSession',
        startTracking: 'startTrackingProgress',
        stopTracking: 'stopTrackingProgress',
      }),
      setWasIncomplete() {
        this.wasIncomplete = this.progress < 1;
      },
      updateProgress(progress) {
        this.updateContentSession({ progress }).then(() =>
          updateContentNodeProgress(this.contentNodeId, this.progress)
        );
        this.$emit('updateProgress', progress);
      },
      addProgress(progressDelta) {
        this.updateContentSession({ progressDelta }).then(() =>
          updateContentNodeProgress(this.contentNodeId, this.progress)
        );
        this.$emit('addProgress', progressDelta);
      },
      updateContentState(contentState) {
        this.updateContentSession({ contentState });
      },
      navigateTo(message) {
        let id = message.nodeId;
        return ContentNodeResource.fetchModel({ id })
          .then(contentNode => {
            router.push(this.genContentLink(contentNode.id, null, contentNode.is_leaf, null, {}));
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
      markAsComplete() {
        this.wasIncomplete = false;
      },
      onError(error) {
        this.$store.dispatch('handleApiError', error);
      },
    },
    $trs: {
      documentTitle: {
        message: '{ contentTitle } - { channelTitle }',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
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
