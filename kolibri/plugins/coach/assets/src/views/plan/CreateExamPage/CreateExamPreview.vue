<template>

  <CoachImmersivePage
    :appBarTitle="$tr('appBarLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    icon="back"
    :pageTitle="$tr('title')"
    :route="toolbarRoute"
  >
    <KPageContainer>
      <h1>{{ $tr('preview') }}</h1>
      <h2>{{ coachString('detailsLabel') }}</h2>
      <KGrid>
        <KGridItem :layout12="{ span: 6 }">
          <KTextbox
            ref="title"
            v-model.trim="examTitle"
            :label="coachString('titleLabel')"
            :autofocus="true"
            :maxlength="100"
            :invalid="Boolean(showError && titleIsInvalidText)"
            :invalidText="titleIsInvalidText"
            @input="showTitleError = false"
          />
        </KGridItem>
        <KGridItem
          :layout12="{ span: 6 }"
          class="number-input-grid-item"
        >
          <KTextbox
            ref="numQuest"
            v-model.trim.number="numQuestions"
            type="number"
            :min="1"
            :max="maxQs"
            :label="$tr('numQuestions')"
            :invalid="Boolean(showError && numQuestIsInvalidText)"
            :invalidText="numQuestIsInvalidText"
            class="number-field"
          />
          <KIconButton
            icon="minus"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === 1"
            @click="numQuestions -= 1"
          />
          <KIconButton
            icon="plus"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === maxQs"
            @click="numQuestions += 1"
          />
        </KGridItem>
      </KGrid>
      <div>
        <KIconButton
          icon="refresh"
          aria-hidden="true"
          tabindex="-1"
          :color="$themeTokens.primary"
          @click="getNewQuestionSet"
        />
        <KButton
          :text="$tr('randomize')"
          appearance="basic-link"
          :primary="false"
          @click="getNewQuestionSet"
        />
      </div>
      <h2 class="header-margin">
        {{ coachString('questionOrderLabel') }}
      </h2>
      <div>
        <KRadioButton
          v-model="fixedOrder"
          :label="coachString('orderRandomLabel')"
          :description="coachString('orderRandomDescription')"
          :value="false"
        />
        <KRadioButton
          v-model="fixedOrder"
          :label="coachString('orderFixedLabel')"
          :description="coachString('orderFixedDescription')"
          :value="true"
        />
      </div>

      <h2 class="header-margin">
        {{ $tr('questionsLabel') }}
      </h2>

      <QuestionListPreview
        v-if="!loadingNewQuestions"
        :fixedOrder="fixedOrder"
        :selectedQuestions="selectedQuestions"
        :selectedExercises="selectedExercises"
      />

      <BottomAppBar style="z-index: 1062;">
        <KButtonGroup>
          <KRouterLink
            appearance="flat-button"
            :text="$tr('previousStep')"
            :to="toolbarRoute"
          />
          <KButton
            :text="coreString('finishAction')"
            :disabled="loadingNewQuestions"
            primary
            @click="submit"
          />
        </KButtonGroup>
      </BottomAppBar>
    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import { mapState } from 'vuex';

  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import { MAX_QUESTIONS } from '../../../constants/examConstants';
  import QuestionListPreview from './QuestionListPreview';

  export default {
    name: 'CreateExamPreview',
    components: {
      BottomAppBar,
      CoachImmersivePage,
      QuestionListPreview,
    },
    mixins: [responsiveWindowMixin, commonCoach, commonCoreStrings],
    data() {
      return {
        showError: false,
        showTitleError: false,
      };
    },
    computed: {
      ...mapState(['toolbarRoute']),
      ...mapState('examCreation', [
        'loadingNewQuestions',
        'selectedQuestions',
        'selectedExercises',
        'availableQuestions',
      ]),
      maxQs() {
        return MAX_QUESTIONS;
      },
      examTitle: {
        get() {
          return this.$store.state.examCreation.title;
        },
        set(value) {
          this.$store.commit('examCreation/SET_TITLE', value);
        },
      },
      numQuestions: {
        get() {
          return this.$store.state.examCreation.numberOfQuestions;
        },
        set(value) {
          if (value && value >= 1 && value <= this.maxQs) {
            this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', value);
            this.$store.dispatch('examCreation/updateSelectedQuestions');
          }
        },
      },
      fixedOrder: {
        get() {
          return this.$store.state.examCreation.learnersSeeFixedOrder;
        },
        set(value) {
          this.$store.commit('examCreation/SET_FIXED_ORDER', value);
        },
      },
      titleIsInvalidText() {
        if (this.examTitle === '') {
          return this.coreString('requiredFieldError');
        }
        if (this.showTitleError) {
          return this.coachString('quizDuplicateTitleError');
        }
        return null;
      },
      numQuestIsInvalidText() {
        if (this.numQuestions === '') {
          return this.$tr('numQuestionsBetween');
        }
        if (this.numQuestions < 1 || this.numQuestions > 50) {
          return this.$tr('numQuestionsBetween');
        }
        if (!Number.isInteger(this.numQuestions)) {
          return this.$tr('numQuestionsBetween');
        }
        if (this.numQuestions > this.availableQuestions) {
          return this.$tr('numQuestionsExceed', {
            inputNumQuestions: this.numQuestions,
            maxQuestionsFromSelection: this.availableQuestions,
          });
        }
        return null;
      },
    },
    methods: {
      getNewQuestionSet() {
        this.$store.commit('examCreation/RANDOMIZE_SEED');
        this.$store.dispatch('examCreation/updateSelectedQuestions');
      },
      submit() {
        if (this.numQuestIsInvalidText) {
          this.showError = true;
          this.$refs.numQuest.focus();
        } else if (this.titleIsInvalidText) {
          this.showError = true;
          this.$refs.title.focus();
        } else {
          const params = {
            classId: this.classId,
          };
          this.$store
            .dispatch('examCreation/createExamAndRoute', params)
            .then(() => {
              this.showSnackbarNotification('quizCreated');
            })
            .catch(error => {
              const errors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
              if (errors) {
                this.showError = true;
                this.showTitleError = true;
                this.$refs.title.focus();
              } else {
                this.$store.dispatch('handleApiError', error);
              }
            });
        }
      },
    },
    $trs: {
      title: {
        message: 'Select questions',
        context: 'Refers to questions that a coach can choose to include in a quiz.',
      },
      appBarLabel: {
        message: 'Select exercises',
        context:
          "Title of the 'Select exercises' page which displays when the coach is creating a new quiz.",
      },
      randomize: {
        message: 'Choose a different set of questions',
        context:
          'Option that a coach can select when creating quizzes.\n\nThey use it to obtain an alternative selection of questions to display based on the chosen learning resource.',
      },
      questionsLabel: {
        message: 'Questions',
        context: 'Refers to quiz questions.',
      },
      preview: {
        message: 'Preview quiz',
        context:
          'When coaches have finished selecting resources for a quiz, they can preview the quiz to see what it looks like.',
      },
      numQuestionsBetween: {
        message: 'Enter a number between 1 and 50',
        context:
          "Refers to an error if the coach inputs a number of quiz questions that's not between 1 and 50. Quizzes cannot have less than 1 or more than 50 questions.",
      },
      numQuestionsExceed: {
        message:
          'The max number of questions based on the exercises you selected is {maxQuestionsFromSelection}. Select more exercises to reach {inputNumQuestions} questions, or lower the number of questions to {maxQuestionsFromSelection}.',
        context:
          'This message displays if the learning resource has less questions than the number selected by the coach initially.\n',
      },
      numQuestions: {
        message: 'Number of questions',
        context: 'Indicates the number of questions a quiz has.',
      },
      previousStep: {
        message: 'Previous step',
        context: 'Label for a button to exit the exam preview and return to resource selection.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .number-field {
    display: inline-block;
    max-width: 250px;
    margin-right: 8px;
  }

  .number-btn {
    position: relative;
    top: 16px;
    display: inline-block;
    vertical-align: top;
  }

  .header-margin {
    margin-top: 32px;
  }

  .sortable-ghost {
    visibility: hidden;
  }

  .sortable-ghost * {
    visibility: hidden;
  }

</style>
