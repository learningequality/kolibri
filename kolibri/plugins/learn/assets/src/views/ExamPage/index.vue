<template>

  <ImmersivePage
    :route="homePageLink"
    :appBarTitle="exam.title || ''"
  >
    <KGrid :gridStyle="gridStyle">
      <!-- this.$refs.questionListWrapper is referenced inside AnswerHistory for scrolling -->
      <KGridItem
        v-if="windowIsLarge"
        ref="questionListWrapper"
        :layout12="{ span: 4 }"
        class="column-pane"
      >
        <div class="column-contents-wrapper">
          <KPageContainer>
            <div>
              <p>{{ coreString('timeSpentLabel') }}</p>
              <div :style="{ paddingBottom: '8px' }">
                <TimeDuration class="timer" :seconds="time_spent" />
              </div>
              <p v-if="content && content.duration">
                {{ learnString('suggestedTime') }}
              </p>
              <SuggestedTime
                v-if="content && content.duration"
                class="timer"
                :seconds="content.duration"
              />
            </div>
            <span
              class="divider"
              :style="{ borderTop: `solid 1px ${$themeTokens.fineLine}` }"
            >
            </span>
            <AnswerHistory
              :pastattempts="pastattempts"
              :questions="questions"
              :questionNumber="questionNumber"
              :wrapperComponentRefs="this.$refs"
              @goToQuestion="goToQuestion"
            />
          </KPageContainer>
        </div>
      </KGridItem>
      <KGridItem :layout12="{ span: 8 }" class="column-pane">
        <main :class="{ 'column-contents-wrapper': !windowIsSmall }">
          <KPageContainer>

            <h1>
              {{ $tr('question', { num: questionNumber + 1, total: exam.question_count }) }}
            </h1>
            <ContentRenderer
              v-if="content && itemId"
              ref="contentRenderer"
              :kind="content.kind"
              :files="content.files"
              :available="content.available"
              :extraFields="content.extra_fields"
              :itemId="itemId"
              :assessment="true"
              :allowHints="false"
              :answerState="currentAttempt.answer"
              @interaction="saveAnswer"
            />
            <MissingResourceAlert v-else :multiple="false" />
          </KPageContainer>

          <BottomAppBar :dir="bottomBarLayoutDirection" :maxWidth="null">
            <component :is="windowIsSmall ? 'div' : 'KButtonGroup'">
              <KButton
                :disabled="questionNumber === exam.question_count - 1"
                :primary="true"
                :dir="layoutDirReset"
                :aria-label="$tr('nextQuestion')"
                :appearanceOverrides="navigationButtonStyle"
                @click="goToQuestion(questionNumber + 1)"
              >
                <span v-if="displayNavigationButtonLabel">{{ $tr('nextQuestion') }}</span>
                <template #iconAfter>
                  <KIcon
                    icon="forward"
                    :color="$themeTokens.textInverted"
                    :style="navigationIconStyleNext"
                  />
                </template>
              </KButton>
              <KButton
                :disabled="questionNumber === 0"
                :primary="true"
                :dir="layoutDirReset"
                :appearanceOverrides="navigationButtonStyle"
                :class="{ 'left-align': windowIsSmall }"
                :aria-label="$tr('previousQuestion')"
                @click="goToQuestion(questionNumber - 1)"
              >
                <template #icon>
                  <KIcon
                    icon="back"
                    :color="$themeTokens.textInverted"
                    :style="navigationIconStylePrevious"
                  />
                </template>
                <span v-if="displayNavigationButtonLabel">{{ $tr('previousQuestion') }}</span>
              </KButton>
            </component>

            <!-- below prev/next buttons in tab and DOM order, in footer -->
            <div
              v-if="windowIsLarge"
              :dir="layoutDirReset"
              class="left-align"
            >
              <div v-if="!missingResources" class="answered">
                {{ answeredText }}
              </div>
              <KButton
                v-if="!missingResources"
                :text="$tr('submitExam')"
                :primary="false"
                appearance="flat-button"
                @click="toggleModal"
              />
              <div v-if="missingResources" class="nosubmit">
                {{ $tr('unableToSubmit') }}
              </div>
            </div>

          </BottomAppBar>

          <!-- below prev/next buttons in tab and DOM order, in page -->
          <KPageContainer v-if="!windowIsLarge">
            <div
              class="bottom-block"
              :class="{ windowIsSmall }"
            >
              <div v-if="!missingResources" class="answered">
                {{ answeredText }}
              </div>
              <KButton
                v-if="!missingResources"
                :text="$tr('submitExam')"
                :primary="false"
                appearance="flat-button"
                @click="toggleModal"
              />
              <div v-if="missingResources" class="nosubmit">
                {{ $tr('unableToSubmit') }}
              </div>
            </div>
          </KPageContainer>
        </main>
      </KGridItem>
    </KGrid>


    <KModal
      v-if="submitModalOpen"
      :title="$tr('submitExam')"
      :submitText="$tr('submitExam')"
      :cancelText="coreString('goBackAction')"
      @submit="finishExam"
      @cancel="toggleModal"
    >
      <p>{{ $tr('areYouSure') }}</p>
      <p v-if="questionsUnanswered">
        {{ $tr('unanswered', { numLeft: questionsUnanswered } ) }}
      </p>
    </KModal>
  </ImmersivePage>

</template>


<script>

  import { mapState } from 'vuex';
  import isEqual from 'lodash/isEqual';
  import debounce from 'lodash/debounce';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import SuggestedTime from 'kolibri.coreVue.components.SuggestedTime';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert';
  import useProgressTracking from '../../composables/useProgressTracking';
  import { PageNames, ClassesPageNames } from '../../constants';
  import { LearnerClassroomResource } from '../../apiResources';

  import AnswerHistory from './AnswerHistory';

  export default {
    name: 'ExamPage',
    metaInfo() {
      return {
        title: this.exam.title,
      };
    },
    components: {
      AnswerHistory,
      UiAlert,
      UiIconButton,
      BottomAppBar,
      TimeDuration,
      SuggestedTime,
      ImmersivePage,
      MissingResourceAlert,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    setup() {
      const {
        pastattempts,
        time_spent,
        initContentSession,
        updateContentSession,
        startTrackingProgress,
        stopTrackingProgress,
      } = useProgressTracking();
      return {
        pastattempts,
        time_spent,
        initContentSession,
        updateContentSession,
        startTrackingProgress,
        stopTrackingProgress,
      };
    },
    data() {
      return {
        submitModalOpen: false,
        // Note this time is only used to calculate the time spent on a
        // question, it is not used to generate any timestamps.
        startTime: Date.now(),
      };
    },
    computed: {
      ...mapState('examViewer', ['exam', 'contentNodeMap', 'questions', 'questionNumber']),
      gridStyle() {
        if (!this.windowIsSmall) {
          return {
            position: 'fixed',
            top: '64px',
            right: '16px',
            bottom: '72px',
            left: '16px',
          };
        }
        return {};
      },
      answeredText() {
        return this.$tr('questionsAnswered', {
          numAnswered: this.questionsAnswered,
          numTotal: this.exam.question_count,
        });
      },
      backPageLink() {
        return {
          name: ClassesPageNames.CLASS_ASSIGNMENTS,
        };
      },
      homePageLink() {
        return {
          name: PageNames.HOME,
        };
      },
      content() {
        return this.contentNodeMap[this.nodeId];
      },
      currentAttempt() {
        return (
          this.pastattempts.find(attempt => attempt.item === this.attemptLogItemValue) || {
            item: this.attemptLogItemValue,
            complete: false,
            time_spent: 0,
            correct: 0,
            answer: null,
            simple_answer: '',
            hinted: false,
          }
        );
      },
      currentQuestion() {
        return this.questions[this.questionNumber];
      },
      nodeId() {
        return this.currentQuestion ? this.currentQuestion.exercise_id : null;
      },
      missingResources() {
        return this.questions.some(q => !this.contentNodeMap[q.exercise_id]);
      },
      itemId() {
        return this.currentQuestion ? this.currentQuestion.question_id : null;
      },
      // We generate a special item value to save to the backend that encodes
      // both the itemId and the nodeId
      attemptLogItemValue() {
        return `${this.nodeId}:${this.itemId}`;
      },
      questionsAnswered() {
        return Object.keys(
          this.pastattempts.reduce((map, attempt) => {
            if (attempt.answer) {
              map[attempt.item] = true;
            }
            return map;
          }, {})
        ).length;
      },
      questionsUnanswered() {
        return this.exam.question_count - this.questionsAnswered;
      },
      debouncedSetAndSaveCurrentExamAttemptLog() {
        // So as not to share debounced functions between instances of the same component
        // and also to allow access to the cancel method of the debounced function
        // best practice seems to be to do it as a computed property and not a method:
        // https://github.com/vuejs/vue/issues/2870#issuecomment-219096773
        return debounce(this.setAndSaveCurrentExamAttemptLog, 500);
      },
      bottomBarLayoutDirection() {
        // Allows contents to be displayed visually in reverse-order,
        // but semantically in correct order.
        return this.isRtl ? 'ltr' : 'rtl';
      },
      layoutDirReset() {
        // Overrides bottomBarLayoutDirection reversal
        return this.isRtl ? 'rtl' : 'ltr';
      },
      displayNavigationButtonLabel() {
        return this.windowBreakpoint > 0;
      },
      navigationButtonStyle() {
        return this.displayNavigationButtonLabel
          ? {}
          : { minWidth: '36px', width: '36px', padding: 0 };
      },
      navigationIconStyleNext() {
        return this.displayNavigationButtonLabel
          ? { position: 'relative', top: '3px', left: '4px' }
          : {};
      },
      navigationIconStylePrevious() {
        return this.displayNavigationButtonLabel
          ? { position: 'relative', top: '3px', left: '-4px' }
          : {};
      },
    },
    watch: {
      attemptLogItemValue(newVal, oldVal) {
        if (newVal !== oldVal) {
          this.startTime = Date.now();
        }
      },
    },
    created() {
      this.initContentSession({ quizId: this.$route.params.examId })
        .then(this.startTrackingProgress)
        .catch(err => {
          if (err.response && err.response.status === 403) {
            // If exam is closed, then redirect to route for the report
            return this.router.replace({
              name: ClassesPageNames.EXAM_REPORT_VIEWER,
              params: {
                userId: this.$store.getters.currentUserId,
                examId: this.exam.id,
                questionNumber: 0,
                questionInteraction: 0,
              },
            });
          }
          this.$store.dispatch('handleApiError', { error: err });
        });
    },
    methods: {
      setAndSaveCurrentExamAttemptLog({ close, interaction } = {}) {
        // Clear the learner classroom cache here as its progress data is now
        // stale
        LearnerClassroomResource.clearCache();

        const data = {};

        if (interaction) {
          data.interaction = { ...interaction, replace: true };
        }

        if (close) {
          data.progress = 1;
        }

        return this.updateContentSession(data)
          .then(() => {
            if (close) {
              this.stopTrackingProgress();
            }
          })
          .catch(() => {
            this.$router.replace({ name: ClassesPageNames.CLASS_ASSIGNMENTS });
          });
      },
      checkAnswer() {
        if (this.$refs.contentRenderer) {
          return this.$refs.contentRenderer.checkAnswer();
        }
        return null;
      },
      saveAnswer(close = false) {
        const answer = this.checkAnswer();
        if (answer && !isEqual(answer.answerState, this.currentAttempt.answer)) {
          const interaction = {
            answer: answer.answerState,
            simple_answer: answer.simpleAnswer || '',
            correct: answer.correct,
            item: this.attemptLogItemValue,
            id: this.currentAttempt.id,
            time_spent:
              ((this.currentAttempt.time_spent || 0) + Date.now() - this.startTime) / 1000,
          };
          this.startTime = Date.now();
          if (close) {
            return this.setAndSaveCurrentExamAttemptLog({ close, interaction });
          } else {
            return this.debouncedSetAndSaveCurrentExamAttemptLog({ interaction });
          }
        } else if (close) {
          return this.setAndSaveCurrentExamAttemptLog({ close });
        }
        return Promise.resolve();
      },
      goToQuestion(questionNumber) {
        const promise = this.debouncedSetAndSaveCurrentExamAttemptLog.flush() || Promise.resolve();
        promise.then(() => {
          this.$router.push({
            name: ClassesPageNames.EXAM_VIEWER,
            params: {
              examId: this.exam.id,
              questionNumber,
            },
          });
        });
      },
      toggleModal() {
        // Flush any existing save event to ensure
        // that the subit modal contains the latest state
        if (!this.submitModalOpen) {
          const promise =
            this.debouncedSetAndSaveCurrentExamAttemptLog.flush() || Promise.resolve();
          return promise.then(() => {
            this.submitModalOpen = !this.submitModalOpen;
          });
        }
        this.submitModalOpen = !this.submitModalOpen;
      },
      finishExam() {
        this.saveAnswer(true).then(() => {
          this.$router.push(this.backPageLink);
        });
      },
    },
    $trs: {
      submitExam: {
        message: 'Submit quiz',
        context:
          'Action that learner takes to submit their quiz answers so that the coach can review them.',
      },
      questionsAnswered: {
        message:
          '{numAnswered, number} of {numTotal, number} {numTotal, plural, one {question answered} other {questions answered}}',
        context:
          'Indicates the number of questions a learner has answered. Only translate "of" and "question/questions answered".',
      },
      previousQuestion: {
        message: 'Previous',
        context: 'Button indicating the previous question in a quiz.',
      },
      nextQuestion: {
        message: 'Next',
        context: 'Button indicating the next question in a quiz.',
      },
      areYouSure: {
        message: 'You cannot change your answers after you submit',
        context:
          "Message a learner sees when they submit answers in an exercise to their coach. It serves as a way of checking that the user is aware that once they've submitted their answers, they cannot change them afterwards.",
      },
      unanswered: {
        message:
          'You have {numLeft, number} {numLeft, plural, one {question unanswered} other {questions unanswered}}',

        context: 'Indicates how many questions the learner has not answered.',
      },
      question: {
        message: 'Question {num, number, integer} of {total, number, integer}',
        context:
          'Indicates which question the user is working on currently and the total number of questions in a quiz.\n\nFor example: "Question 2 of 10".',
      },
      unableToSubmit: {
        message: 'Unable to submit quiz because some resources are missing or not supported',
        context:
          'Indicates that a learner cannot submit the quiz because they are not able to see all the questions.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .answered {
    display: inline-block;
    margin-right: 8px;
    margin-left: 8px;
    white-space: nowrap;
  }

  .nosubmit {
    display: inline-block;
    margin-top: 8px;
    margin-right: 8px;
    margin-left: 8px;
  }

  .column-pane {
    height: 100%;
    padding-bottom: 32px;
    overflow-y: auto;
  }

  .column-contents-wrapper {
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .bottom-block {
    margin-top: 8px;
  }

  .bottom-block.windowIsSmall {
    text-align: center;
  }

  .left-align {
    position: absolute;
    left: 16px;
    display: inline-block;
  }

  .timer {
    font-size: 18px;
    font-weight: bold;
  }

  .divider {
    display: block;
    min-width: 100%;
    height: 1px;
    margin: 16px 0;
    overflow-y: hidden;
  }

</style>
