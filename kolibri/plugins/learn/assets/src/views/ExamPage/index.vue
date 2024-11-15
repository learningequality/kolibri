<template>

  <ImmersivePage
    :route="homePageLink"
    :appBarTitle="exam.title || ''"
  >
    <KCircularLoader v-if="loading || !currentQuestion" />

    <div v-else>
      <KGrid :gridStyle="gridStyle">
        <!-- this.$refs.questionListWrapper is referenced inside AnswerHistory for scrolling -->
        <KGridItem
          v-if="showQuestionsList"
          ref="questionListWrapper"
          :layout12="{ span: 4 }"
          class="column-pane"
        >
          <div class="column-contents-wrapper">
            <KPageContainer style="padding: 0">
              <AnswerHistory
                :pastattempts="pastattempts"
                :sections="sections"
                :currentSectionIndex="currentSectionIndex"
                :questionNumber="questionNumber"
                :questionItem="attemptLogItemValue"
                :wrapperComponentRefs="$refs"
                @goToQuestion="goToQuestion"
              />
            </KPageContainer>
          </div>
        </KGridItem>

        <KGridItem
          :layout12="{ span: 8 }"
          class="column-pane"
          :style="!showQuestionsList ? { overflow: 'unset' } : {}"
        >
          <main :class="{ 'column-contents-wrapper': !windowIsSmall }">
            <KPageContainer
              v-if="windowIsLarge"
              dir="auto"
              style="overflow-x: visible"
            >
              <KGrid>
                <KGridItem :layout12="{ span: 8 }">
                  <h2 class="section-title">
                    {{ displaySectionTitle(currentSection, currentSectionIndex) }}
                  </h2>
                  <p v-if="currentSection.description">{{ currentSection.description }}</p>
                </KGridItem>
                <KGridItem :layout12="{ span: 4 }">
                  <div :style="{ margin: '2em auto 0', textAlign: 'center', width: '100%' }">
                    <div>{{ coreString('timeSpentLabel') }}:</div>
                    <TimeDuration
                      class="timer"
                      aria-live="polite"
                      role="timer"
                      :seconds="time_spent"
                    />
                  </div>
                </KGridItem>
              </KGrid>
            </KPageContainer>
            <div v-else>
              <KPageContainer
                dir="auto"
                class="quiz-container"
              >
                <span>{{ coreString('timeSpentLabel') }}:</span>
                <TimeDuration
                  class="timer"
                  aria-live="polite"
                  role="timer"
                  :seconds="time_spent"
                />
              </KPageContainer>
              <KPageContainer
                dir="auto"
                class="quiz-container"
              >
                <div v-if="windowIsSmall || windowIsMedium">
                  <KSelect
                    v-if="sectionSelectOptions.length > 1"
                    :value="currentSectionOption"
                    :options="sectionSelectOptions"
                    :label="quizSectionsLabel$()"
                    @select="handleSectionOptionChange"
                  >
                    <template #display>
                      <KIcon
                        class="dot"
                        :icon="sectionQuestionsIcon(currentSectionIndex)"
                        :color="sectionQuestionsIconColor(currentSectionIndex)"
                      />
                      <span>{{ currentSectionOption.label }}</span>
                    </template>
                    <template #option="{ index, option }">
                      <KIcon
                        class="dot"
                        :icon="sectionQuestionsIcon(index)"
                        :color="sectionQuestionsIconColor(index)"
                      />
                      <span>{{ option.label }}</span>
                    </template>
                  </KSelect>
                  <h2
                    v-else-if="currentSectionOption.label"
                    class="section-select"
                  >
                    {{ currentSectionOption.label }}
                  </h2>
                </div>
                <p v-if="currentSection.description">{{ currentSection.description }}</p>
                <p v-if="content && content.duration">
                  {{ learnString('suggestedTime') }}
                </p>
                <SuggestedTime
                  v-if="content && content.duration"
                  class="timer"
                  :seconds="content.duration"
                />
              </KPageContainer>
            </div>
            <KPageContainer style="overflow-x: visible">
              <KSelect
                v-if="windowIsSmall || windowIsMedium"
                style="margin-top: 1em"
                :value="currentQuestionOption"
                :options="questionSelectOptions"
                :label="questionsLabel$()"
                @select="handleQuestionOptionChange"
              >
                <template #display>
                  <KIcon
                    v-if="currentQuestionOption.disabled"
                    class="dot"
                    icon="warning"
                    :color="$themePalette.yellow.v_600"
                  />
                  <KIcon
                    v-else
                    class="dot"
                    :icon="
                      isAnswered(currentQuestionOption.value)
                        ? 'unpublishedResource'
                        : 'unpublishedChange'
                    "
                    :color="
                      isAnswered(currentQuestionOption.value)
                        ? $themeTokens.progress
                        : $themeTokens.textDisabled
                    "
                  />
                  <span>
                    {{ currentQuestionOption.label }}
                  </span>
                </template>
                <template #option="{ option }">
                  <KIcon
                    v-if="option.disabled"
                    class="dot"
                    icon="warning"
                    :color="$themePalette.yellow.v_600"
                  />
                  <KIcon
                    v-else
                    class="dot"
                    :icon="isAnswered(option.value) ? 'unpublishedResource' : 'unpublishedChange'"
                    :color="
                      isAnswered(option.value) ? $themeTokens.progress : $themeTokens.textDisabled
                    "
                  />
                  <span>
                    {{ option.label }}
                  </span>
                </template>
              </KSelect>
              <h2
                v-else
                class="number-of-questions"
              >
                {{ $tr('question', { num: questionNumber + 1, total: exam.question_count }) }}
              </h2>
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
              <ResourceSyncingUiAlert
                v-else
                :multiple="false"
              />
            </KPageContainer>
          </main>
        </KGridItem>
      </KGrid>
      <BottomAppBar :maxWidth="null">
        <KButtonGroup :class="{ spread: !windowIsLarge }">
          <KButton
            :disabled="questionNumber === 0"
            :primary="true"
            :dir="layoutDirReset"
            :appearanceOverrides="navigationButtonStyle"
            :aria-label="$tr('previousQuestion')"
            @click="goToPreviousQuestion"
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
          <KButton
            :disabled="questionNumber === exam.question_count - 1"
            :primary="true"
            :dir="layoutDirReset"
            :aria-label="$tr('nextQuestion')"
            :appearanceOverrides="navigationButtonStyle"
            @click="goToNextQuestion"
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
          <!-- below prev/next buttons in tab and DOM order -->
          <KButton
            v-if="!windowIsLarge && questionsUnanswered === 0"
            :text="$tr('submitExam')"
            :primary="true"
            appearance="raised-button"
            @click="finishExam"
          />
          <KButton
            v-else-if="!windowIsLarge && !missingResources"
            :text="$tr('submitExam')"
            :primary="false"
            appearance="flat-button"
            @click="toggleModal"
          />
        </KButtonGroup>

        <!-- below prev/next buttons in tab and DOM order, in footer -->
        <div
          v-if="windowIsLarge"
          :dir="layoutDirReset"
          class="left-align"
        >
          <div
            v-if="!missingResources"
            class="answered"
          >
            {{ answeredText }}
          </div>
          <KButton
            v-if="questionsUnanswered === 0"
            :text="$tr('submitExam')"
            :primary="true"
            appearance="raised-button"
            @click="finishExam"
          />
          <KButton
            v-else-if="!missingResources"
            :text="$tr('submitExam')"
            :primary="false"
            appearance="flat-button"
            @click="toggleModal"
          />
          <div
            v-if="missingResources"
            class="nosubmit"
          >
            {{ $tr('unableToSubmit') }}
          </div>
        </div>
      </BottomAppBar>
    </div>

    <KModal
      v-if="submitModalOpen"
      :title="$tr('submitExam')"
      :submitText="$tr('submitExam')"
      :cancelText="coreString('cancelAction')"
      @submit="finishExam"
      @cancel="toggleModal"
    >
      <p v-if="questionsUnanswered">
        {{ $tr('unanswered', { numLeft: questionsUnanswered }) }}
      </p>
      <p>{{ $tr('areYouSure') }}</p>
    </KModal>
  </ImmersivePage>

</template>


<script>

  import { mapState } from 'vuex';
  import isEqual from 'lodash/isEqual';
  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import debounce from 'lodash/debounce';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import { annotateSections } from 'kolibri-common/quizzes/utils';
  import useUser from 'kolibri/composables/useUser';
  import ResourceSyncingUiAlert from '../ResourceSyncingUiAlert';
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
      BottomAppBar,
      ImmersivePage,
      ResourceSyncingUiAlert,
      TimeDuration,
    },
    mixins: [commonCoreStrings],
    setup() {
      const {
        pastattempts,
        time_spent,
        initContentSession,
        updateContentSession,
        startTrackingProgress,
        stopTrackingProgress,
      } = useProgressTracking();
      const { currentUserId } = useUser();
      const { windowBreakpoint, windowIsMedium, windowIsLarge, windowIsSmall } =
        useKResponsiveWindow();
      const { quizSectionsLabel$, questionsLabel$ } = enhancedQuizManagementStrings;
      return {
        questionsLabel$,
        quizSectionsLabel$,
        displaySectionTitle,
        pastattempts,
        time_spent,
        initContentSession,
        updateContentSession,
        startTrackingProgress,
        stopTrackingProgress,
        windowBreakpoint,
        windowIsLarge,
        windowIsSmall,
        windowIsMedium,
        currentUserId,
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
      ...mapState({
        loading: state => state.core.loading,
      }),
      ...mapState('examViewer', ['exam', 'contentNodeMap', 'questions', 'questionNumber']),
      questionSelectOptions() {
        if (!this.currentSection) return [];
        return (
          this.currentSection.questions.map((question, i) => ({
            label: this.$tr('question', {
              num: this.currentSection.startQuestionNumber + i + 1,
              total: this.exam.question_count,
            }),
            value: this.currentSection.startQuestionNumber + i,
            disabled: question.missing,
          })) || []
        );
      },
      currentQuestionOption() {
        return this.questionSelectOptions[
          this.questionNumber - this.currentSection.startQuestionNumber
        ];
      },
      currentSectionIndex() {
        return this.sections.findIndex(
          section =>
            section.startQuestionNumber <= this.questionNumber &&
            section.endQuestionNumber >= this.questionNumber,
        );
      },
      currentSection() {
        return this.sections[this.currentSectionIndex];
      },
      sections() {
        return annotateSections(this.exam.question_sources || [], this.questions);
      },
      sectionSelectOptions() {
        return this.sections.map((section, i) => ({
          label: this.displaySectionTitle(section, i),
          value: i,
        }));
      },
      currentSectionOption() {
        return this.sectionSelectOptions[this.currentSectionIndex];
      },
      sectionCompletionMap() {
        const answeredAttemptItems = this.pastattempts.filter(a => a.answer).map(a => a.item);
        return this.sections.reduce((acc, { questions }, index) => {
          acc[index] = questions
            .filter(q => answeredAttemptItems.includes(q.item))
            .map(q => q.item);

          return acc;
        }, {});
      },
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
        if (!this.currentQuestion) {
          return null;
        }
        return this.currentQuestion.item;
      },
      questionsAnswered() {
        return Object.keys(
          this.pastattempts.reduce((map, attempt) => {
            if (attempt.answer) {
              map[attempt.item] = true;
            }
            return map;
          }, {}),
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
      showQuestionsList() {
        return this.windowIsLarge;
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
                userId: this.currentUserId,
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
      sectionQuestionsIconColor(index) {
        const answered = this.sectionCompletionMap[index].length;
        const total = this.sections[index].questions.length;
        if (answered === total) {
          return this.$themeTokens.progress;
        } else if (answered > 0) {
          return this.$themeTokens.progress;
        }
        return this.$themeTokens.textDisabled;
      },
      sectionQuestionsIcon(index) {
        const answered = this.sectionCompletionMap[index].length;
        const total = this.sections[index].questions.length;
        if (answered === total) {
          return 'unpublishedResource';
        } else if (answered > 0) {
          return 'unpublishedChange';
        }
        return 'unpublishedChange';
      },
      isAnswered(questionIndex) {
        const question = this.questions[questionIndex];
        const attempt = this.pastattempts.find(attempt => attempt.item === question.item);
        return attempt && attempt.answer;
      },
      handleSectionOptionChange(opt) {
        const index = opt.value;
        if (index === this.currentSectionIndex) {
          return;
        }
        this.goToQuestion(this.sections[index].startQuestionNumber);
      },
      handleQuestionOptionChange(opt) {
        const index = opt.value;
        if (index === this.questionNumber) {
          return;
        }
        this.goToQuestion(opt.value);
      },
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
      goToPreviousQuestion() {
        if (this.questionNumber === 0) {
          return;
        }
        const questionNumber = this.questionNumber - 1;
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
      goToNextQuestion() {
        if (this.questionNumber >= this.questions.length) {
          return;
        }
        const questionNumber = this.questionNumber + 1;
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
        message: 'Submit Quiz',
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

  .spread {
    display: flex;
    justify-content: space-between;
    // Swap the display order of the next and submit buttons
    :nth-child(2) {
      order: 3;
    }

    :nth-child(3) {
      order: 2;
    }
  }

  .left-align {
    position: absolute;
    left: 10px;
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

  .section-title {
    margin-bottom: 0;
    font-size: 1.5rem;
  }

  .number-of-questions {
    margin-bottom: 0;
    font-size: 0.9em;
    font-weight: 400;
    text-align: center;
  }

  .spacing-items {
    padding: 0.5em;
  }

  .quiz-title {
    font-size: 14px;
    font-weight: 700;
  }

  .icon-size {
    font-size: 1.5em;
  }

  .btn-size {
    width: 100%;
    margin-top: 1em;
  }

  .fixed-element {
    position: fixed;
    right: 20px;
    bottom: 20px;
  }

  .centered-text {
    text-align: center;
  }

  .remove-btn-style {
    width: 100%;
    padding: 0;
    background-color: transparent;
    border: 0;
  }

  .dot {
    margin-right: 5px;
  }

  .section-select {
    margin: 0;
  }

  .quiz-container {
    padding: 1em !important;
    overflow-x: visible;
  }

</style>
