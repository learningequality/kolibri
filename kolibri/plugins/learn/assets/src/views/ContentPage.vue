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
        :extraFields="extra_fields"
        :progress="progress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="time_spent"
        @startTracking="startTracking"
        @stopTracking="stopTracking"
        @updateProgress="updateProgress"
        @addProgress="addProgress"
        @updateContentState="updateContentState"
        @navigateTo="navigateTo"
        @error="onError"
      />
      <QuizRenderer
        v-else-if="practiceQuiz || survey"
        class="content-renderer"
        :style="{ paddingBottom: windowIsSmall ? '80px' : '0px' }"
        :content="content"
        :extraFields="extra_fields"
        :progress="progress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="time_spent"
        :pastattempts="pastattempts"
        :mastered="complete"
        :masteryLevel="masteryLevel"
        :updateContentSession="wrappedUpdateContentSession"
        :isSurvey="survey"
        @startTracking="startTracking"
        @stopTracking="stopTracking"
        @updateInteraction="updateInteraction"
        @updateProgress="updateProgress"
        @updateContentState="updateContentState"
        @repeat="repeat"
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
        :extraFields="extra_fields"
        :progress="progress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="time_spent"
        :pastattempts="pastattempts"
        :mastered="complete"
        :totalattempts="totalattempts"
        @startTracking="startTracking"
        @stopTracking="stopTracking"
        @updateInteraction="updateInteraction"
        @updateProgress="updateProgress"
        @updateContentState="updateContentState"
      />
    </template>
    <KCircularLoader v-else />

    <CompletionModal
      v-if="progress >= 1 && wasIncomplete"
      ref="completionModal"
      :isUserLoggedIn="isUserLoggedIn"
      :contentNodeId="content.id"
      :lessonId="lessonId"
      :isQuiz="practiceQuiz"
      :isSurvey="survey"
      @close="markAsComplete"
      @shouldFocusFirstEl="findFirstEl()"
    />
  </div>

</template>


<script>

  import get from 'lodash/get';
  import { mapState, mapGetters } from 'vuex';
  import { ContentNodeResource } from 'kolibri.resources';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import router from 'kolibri.coreVue.router';
  import Modalities from 'kolibri-constants/Modalities';
  import { setContentNodeProgress } from '../composables/useContentNodeProgress';
  import useProgressTracking from '../composables/useProgressTracking';
  import AssessmentWrapper from './AssessmentWrapper';
  import commonLearnStrings from './commonLearnStrings';
  import CompletionModal from './CompletionModal';
  import QuizRenderer from './QuizRenderer';

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
      QuizRenderer,
    },
    mixins: [commonLearnStrings, responsiveWindowMixin],
    setup() {
      const {
        progress,
        time_spent,
        extra_fields,
        pastattempts,
        complete,
        totalattempts,
        context,
        initContentSession,
        updateContentSession,
        startTrackingProgress,
        stopTrackingProgress,
      } = useProgressTracking();
      return {
        progress,
        time_spent,
        extra_fields,
        pastattempts,
        complete,
        totalattempts,
        context,
        initContentSession,
        updateContentSession,
        startTracking: startTrackingProgress,
        stopTracking: stopTrackingProgress,
      };
    },
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
        fullName: state => state.core.session.full_name,
      }),
      practiceQuiz() {
        return get(this, ['content', 'options', 'modality']) === Modalities.QUIZ;
      },
      survey() {
        return get(this, ['content', 'options', 'modality']) === Modalities.SURVEY;
      },
      masteryLevel() {
        return get(this, ['context', 'mastery_level']);
      },
    },
    created() {
      return this.initSession();
    },
    mounted() {
      this.$emit('mounted');
    },
    methods: {
      setWasIncomplete() {
        this.wasIncomplete = this.progress < 1;
      },
      /*
       * Update the progress of the content node in the shared progress store
       * in the useContentNodeProgress composable. Do this to have a single
       * source of truth for referencing progress of content nodes.
       */
      cacheProgress() {
        setContentNodeProgress({ content_id: this.content.content_id, progress: this.progress });
      },
      wrappedUpdateContentSession(data) {
        return this.updateContentSession(data).then(this.cacheProgress);
      },
      updateInteraction({ progress, interaction }) {
        this.updateContentSession({ progress, interaction }).then(this.cacheProgress);
      },
      updateProgress(progress) {
        this.updateContentSession({ progress }).then(this.cacheProgress);
      },
      addProgress(progressDelta) {
        this.updateContentSession({ progressDelta }).then(this.cacheProgress);
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
      initSession(repeat = false) {
        this.sessionReady = false;
        return this.initContentSession({
          nodeId: this.content.id,
          lessonId: this.lessonId,
          repeat,
        }).then(() => {
          this.sessionReady = true;
          this.setWasIncomplete();
          // Set progress into the content node progress store in case it was not already loaded
          this.cacheProgress();
        });
      },
      repeat() {
        this.stopTracking().then(() => {
          this.initSession(true);
        });
      },
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.completionModal.focusFirstEl();
        });
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
