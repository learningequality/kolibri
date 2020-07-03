<template>

  <div>
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
            <AnswerHistory
              :questionNumber="questionNumber"
              :wrapperComponentRefs="this.$refs"
              @goToQuestion="goToQuestion"
            />
          </KPageContainer>
        </div>
      </KGridItem>
      <KGridItem :layout12="{ span: 8 }" class="column-pane">
        <div :class="{ 'column-contents-wrapper': !windowIsSmall }">
          <KPageContainer>
            <h1>
              {{ $tr('question', { num: questionNumber + 1, total: exam.question_count }) }}
            </h1>
            <KContentRenderer
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
            <UiAlert v-else :dismissible="false" type="error">
              {{ $tr('noItemId') }}
            </UiAlert>
          </KPageContainer>

          <BottomAppBar :dir="bottomBarLayoutDirection" :maxWidth="null">
            <KButtonGroup>
              <UiIconButton
                v-if="windowBreakpoint === 0"
                :aria-label="$tr('nextQuestion')"
                size="large"
                type="secondary"
                class="footer-button"
                :disabled="questionNumber === exam.question_count - 1"
                @click="goToQuestion(questionNumber + 1)"
              >
                <mat-svg
                  name="arrow_forward"
                  category="navigation"
                  :style="{ fill: $themeTokens.primary }"
                />
              </UiIconButton>
              <KButton
                v-else
                :disabled="questionNumber === exam.question_count - 1"
                :primary="true"
                class="footer-button"
                :dir="layoutDirReset"
                @click="goToQuestion(questionNumber + 1)"
              >
                {{ $tr('nextQuestion') }}
                <KIcon slot="iconAfter" icon="forward" color="white" class="forward-icon" />
              </KButton>
              <UiIconButton
                v-if="windowBreakpoint === 0"
                :aria-label="$tr('previousQuestion')"
                size="large"
                type="secondary"
                class="footer-button left-align"
                :disabled="questionNumber === 0"
                @click="goToQuestion(questionNumber - 1)"
              >
                <mat-svg
                  name="arrow_back"
                  category="navigation"
                  :style="{ fill: $themeTokens.primary }"
                />
              </UiIconButton>
              <KButton
                v-else
                :disabled="questionNumber === 0"
                :primary="true"
                class="footer-button"
                :dir="layoutDirReset"
                :class="{ 'left-align': windowIsSmall }"
                @click="goToQuestion(questionNumber - 1)"
              >
                <KIcon slot="icon" icon="back" color="white" class="back-icon" />
                {{ $tr('previousQuestion') }}
              </KButton>
            </KButtonGroup>

            <!-- below prev/next buttons in tab and DOM order, in footer -->
            <div
              v-if="windowIsLarge"
              :dir="layoutDirReset"
              class="left-align"
            >
              <div class="answered">
                {{ answeredText }}
              </div>
              <KButton
                :text="$tr('submitExam')"
                :primary="false"
                appearance="flat-button"
                @click="toggleModal"
              />
            </div>

          </BottomAppBar>

          <!-- below prev/next buttons in tab and DOM order, in page -->
          <KPageContainer v-if="!windowIsLarge">
            <div
              class="bottom-block"
              :class="{ windowIsSmall }"
            >
              <div class="answered">
                {{ answeredText }}
              </div>
              <KButton
                :text="$tr('submitExam')"
                :primary="false"
                appearance="flat-button"
                @click="toggleModal"
              />
            </div>
          </KPageContainer>
        </div>
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
  </div>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import { InteractionTypes } from 'kolibri.coreVue.vuex.constants';
  import isEqual from 'lodash/isEqual';
  import { now } from 'kolibri.utils.serverClock';
  import debounce from 'lodash/debounce';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ClassesPageNames } from '../../constants';
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
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    data() {
      return {
        submitModalOpen: false,
      };
    },
    computed: {
      ...mapState('examViewer', [
        'exam',
        'content',
        'itemId',
        'questionNumber',
        'currentAttempt',
        'questionsAnswered',
      ]),
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
      questionsUnanswered() {
        return this.exam.question_count - this.questionsAnswered;
      },
      debouncedSetAndSaveCurrentExamAttemptLog() {
        // So as not to share debounced functions between instances of the same component
        // and also to allow access to the cancel method of the debounced function
        // best practice seems to be to do it as a computed property and not a method:
        // https://github.com/vuejs/vue/issues/2870#issuecomment-219096773
        return debounce(this.setAndSaveCurrentExamAttemptLog, 5000);
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
    },
    watch: {
      itemId(newVal, oldVal) {
        // HACK: manually dismiss the perseus renderer message when moving
        // to a different item (fixes #3853)
        if (newVal !== oldVal) {
          this.$refs.contentRenderer.$refs.contentView.dismissMessage();
        }
      },
    },
    methods: {
      ...mapActions('examViewer', ['setAndSaveCurrentExamAttemptLog', 'closeExam']),
      checkAnswer() {
        if (this.$refs.contentRenderer) {
          return this.$refs.contentRenderer.checkAnswer();
        }
        return null;
      },
      saveAnswer(force = false) {
        const answer = this.checkAnswer();
        if (answer && !isEqual(answer.answerState, this.currentAttempt.answer)) {
          const attempt = Object.assign({}, this.currentAttempt);
          // Copy the interaction history separately, as otherwise we
          // will still be modifying the underlying object
          attempt.interaction_history = Array(...attempt.interaction_history);
          attempt.answer = answer.answerState;
          attempt.simple_answer = answer.simpleAnswer;
          attempt.correct = answer.correct;
          if (!attempt.completion_timestamp) {
            attempt.completion_timestamp = now();
          }
          attempt.end_timestamp = now();
          attempt.interaction_history.push({
            type: InteractionTypes.answer,
            answer: answer.answerState,
            correct: answer.correct,
            timestamp: now(),
          });
          const saveData = {
            contentId: this.content.id,
            itemId: this.itemId,
            currentAttemptLog: attempt,
            examId: this.exam.id,
          };
          if (force) {
            // Cancel any pending debounce
            this.debouncedSetAndSaveCurrentExamAttemptLog.cancel();
            // Force the save now instead
            return this.setAndSaveCurrentExamAttemptLog(saveData);
          } else {
            return this.debouncedSetAndSaveCurrentExamAttemptLog(saveData);
          }
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
        this.saveAnswer(true).then(
          this.closeExam().then(() => {
            this.$router.push(this.backPageLink);
          })
        );
      },
    },
    $trs: {
      submitExam: 'Submit quiz',
      questionsAnswered:
        '{numAnswered, number} of {numTotal, number} {numTotal, plural, one {question} other {questions}} answered',
      previousQuestion: 'Previous',
      nextQuestion: 'Next',
      areYouSure: 'You cannot change your answers after you submit',
      unanswered:
        'You have {numLeft, number} {numLeft, plural, one {question} other {questions}} unanswered',
      noItemId: 'This question has an error, please move on to the next question',
      question: 'Question { num } of { total }',
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

  .back-icon {
    position: relative;
    top: 3px;
    left: -4px;
  }

  .forward-icon {
    position: relative;
    top: 3px;
    left: 4px;
  }

  .left-align {
    position: absolute;
    left: 16px;
    display: inline-block;
  }

  .footer-button {
    display: inline-block;
  }

</style>
