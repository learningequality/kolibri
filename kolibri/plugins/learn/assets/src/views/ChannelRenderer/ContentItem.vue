<template>

  <div>
    <template v-if="sessionReady">
      <KContentRenderer
        v-if="!assessment"
        class="content-renderer"
        v-bind="contentProps"
        v-on="contentHandlers"
      />

      <AssessmentWrapper
        v-else
        class="content-renderer"
        v-bind="exerciseProps"
        v-on="contentHandlers"
      />
    </template>
    <KCircularLoader v-else />

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { updateContentNodeProgress } from '../../modules/coreLearn/utils';
  import AssessmentWrapper from '../AssessmentWrapper';

  export default {
    name: 'ContentItem',
    components: {
      AssessmentWrapper,
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        wasIncomplete: false,
        sessionReady: false,
      };
    },
    computed: {
      ...mapGetters(['currentUserId']),
      ...mapState({
        progress: state => state.core.logging.progress,
        timeSpent: state => state.core.logging.time_spent,
        extraFields: state => state.core.logging.extra_fields,
        fullName: state => state.core.session.full_name,
      }),
      contentIsExercise() {
        return this.contentNode.kind === ContentNodeKinds.EXERCISE;
      },
      contentHandlers() {
        return {
          startTracking: this.startTracking,
          stopTracking: this.stopTracking,
          updateProgress: this.updateProgress,
          addProgress: this.addProgress,
          updateContentState: this.updateContentState,
        };
      },
      contentProps() {
        if (this.contentIsExercise) {
          return {};
        }
        return {
          kind: this.contentNode.kind,
          lang: this.contentNode.lang,
          files: this.contentNode.files,
          options: this.contentNode.options,
          available: this.contentNode.available,
          extraFields: this.extraFields,
          progress: this.progress,
          userId: this.currentUserId,
          userFullName: this.fullName,
          timeSpent: this.timeSpent,
        };
      },
      exerciseProps() {
        if (!this.contentIsExercise) {
          return {};
        }
        const assessment = assessmentMetaDataState(this.contentNode);
        return {
          kind: this.contentNode.kind,
          files: this.contentNode.files,
          lang: this.contentNode.lang,
          randomize: this.contentNode.randomize,
          masteryModel: assessment.masteryModel,
          assessmentIds: assessment.assessmentIds,
          available: this.contentNode.available,
          extraFields: this.extraFields,
          progress: this.progress,
          userId: this.currentUserId,
          userFullName: this.fullName,
          timeSpent: this.timeSpent,
        };
      },
      contentNodeId() {
        return this.contentNode.id;
      },
      assessment() {
        if (this.contentNode.kind !== ContentNodeKinds.EXERCISE) {
          return null;
        } else {
          return assessmentMetaDataState(this.contentNode);
        }
      },
    },
    created() {
      return this.$store
        .dispatch('initContentSession', {
          nodeId: this.contentNodeId,
        })
        .then(() => {
          this.sessionReady = true;
          this.setWasIncomplete();
        });
    },
    beforeDestroy() {
      this.stopTracking();
    },
    methods: {
      startTracking() {
        return this.$store.dispatch('startTrackingProgress');
      },
      stopTracking() {
        return this.$store.dispatch('stopTrackingProgress');
      },
      setWasIncomplete() {
        this.wasIncomplete = this.progress < 1;
      },
      updateProgress(progress) {
        this.$store
          .dispatch('updateContentSession', { progress })
          .then(() => updateContentNodeProgress(this.contentNodeId, this.progress));
      },
      addProgress(progressDelta) {
        this.$store
          .dispatch('updateContentSession', { progressDelta })
          .then(() => updateContentNodeProgress(this.contentNodeId, this.progress));
      },
      updateContentState(contentState) {
        this.$store.dispatch('updateContentSession', { contentState });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content-renderer {
    // Needs to be one less than the ScrollingHeader's z-index of 4
    z-index: 3;
  }

</style>
