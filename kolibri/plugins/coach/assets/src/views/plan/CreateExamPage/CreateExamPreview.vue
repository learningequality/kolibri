<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    immersivePagePrimary
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :marginBottom="72"
  >

    <KPageContainer>
      <h1>{{ previewQuizStrings.$tr('preview') }}</h1>
      <h2>{{ detailsString }}</h2>
      <KGrid>
        <KGridItem sizes="100, 100, 50" percentage>
          <KTextbox
            ref="title"
            v-model.trim="examTitle"
            :label="moreStrings.$tr('title')"
            :autofocus="true"
            :maxlength="100"
            :invalid="Boolean(showError && titleIsInvalidText)"
            :invalidText="titleIsInvalidText"
            @input="showTitleError = false"
          />
        </KGridItem>
        <KGridItem sizes="100, 100, 50" percentage class="number-input-grid-item">
          <KTextbox
            ref="numQuest"
            v-model.trim.number="numQuestions"
            type="number"
            :min="1"
            :max="maxQs"
            :label="moreStrings.$tr('numQuestions')"
            :invalid="Boolean(showError && numQuestIsInvalidText)"
            :invalidText="numQuestIsInvalidText"
            class="number-field"
          />
          <UiIconButton
            type="flat"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === 1"
            @click="numQuestions -= 1"
          >
            <mat-svg name="remove" category="content" />
          </UiIconButton>
          <UiIconButton
            type="flat"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === maxQs"
            @click="numQuestions += 1"
          >
            <mat-svg name="add" category="content" />
          </UiIconButton>
        </KGridItem>
      </KGrid>
      <div>
        <UiIconButton
          type="flat"
          aria-hidden="true"
          tabindex="-1"
          color="primary"
          @click="getNewQuestionSet"
        >
          <mat-svg name="refresh" category="navigation" />
        </UiIconButton>
        <KButton
          :text="$tr('randomize')"
          appearance="basic-link"
          :primary="false"
          @click="getNewQuestionSet"
        />
      </div>
      <h2 class="header-margin">
        {{ $tr('questionOrder') }}
      </h2>
      <div>
        <KRadioButton
          v-model="fixedOrder"
          :label="coachStrings.$tr('orderRandomLabel')"
          :description="coachStrings.$tr('orderRandomDescription')"
          :value="false"
        />
        <KRadioButton
          v-model="fixedOrder"
          :label="coachStrings.$tr('orderFixedLabel')"
          :description="coachStrings.$tr('orderFixedDescription')"
          :value="true"
        />
      </div>
      <h2 class="header-margin">
        {{ $tr('questions') }}
      </h2>

      <QuestionListPreview
        v-if="!loadingNewQuestions"
        :fixedOrder="fixedOrder"
        :selectedQuestions="selectedQuestions"
        :selectedExercises="selectedExercises"
      />

      <Bottom>
        <KRouterLink
          appearance="flat-button"
          :text="coachStrings.$tr('goBackAction')"
          :to="toolbarRoute"
        />
        <KButton
          :text="coachStrings.$tr('finishAction')"
          :disabled="loadingNewQuestions"
          primary
          @click="submit"
        />
      </Bottom>
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import commonCoach from '../../common';
  import QuizDetailEditor from '../../common/QuizDetailEditor';
  import ExamPreview from '../CoachExamsPage/ExamPreview';
  import { MAX_QUESTIONS } from '../../../constants/examConstants';
  import QuestionListPreview from './QuestionListPreview';
  import Bottom from './Bottom';
  import CreateExamPage from './index';

  const createExamPageStrings = crossComponentTranslator(CreateExamPage);
  const quizDetailStrings = crossComponentTranslator(QuizDetailEditor);
  const previewQuizStrings = crossComponentTranslator(ExamPreview);

  export default {
    name: 'CreateExamPreview',
    metaInfo() {
      return {
        title: this.$tr('title'),
      };
    },
    components: {
      UiIconButton,
      KRouterLink,
      KButton,
      KRadioButton,
      KGrid,
      KGridItem,
      Bottom,
      KTextbox,
      QuestionListPreview,
    },
    mixins: [responsiveWindow, commonCoach],
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
      detailsString() {
        return quizDetailStrings.$tr('details');
      },
      moreStrings() {
        return createExamPageStrings;
      },
      previewQuizStrings() {
        return previewQuizStrings;
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
          return createExamPageStrings.$tr('examRequiresTitle');
        }
        if (this.showTitleError) {
          return quizDetailStrings.$tr('duplicateTitle');
        }
        return null;
      },
      numQuestIsInvalidText() {
        if (this.numQuestions === '') {
          return createExamPageStrings.$tr('numQuestionsBetween');
        }
        if (this.numQuestions < 1 || this.numQuestions > 50) {
          return createExamPageStrings.$tr('numQuestionsBetween');
        }
        if (!Number.isInteger(this.numQuestions)) {
          return createExamPageStrings.$tr('numQuestionsBetween');
        }
        if (this.numQuestions > this.availableQuestions) {
          return createExamPageStrings.$tr('numQuestionsExceed', {
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
      numCoachContents(exerciseId) {
        return this.selectedExercises[exerciseId].num_coach_contents;
      },
      submit() {
        if (this.numQuestIsInvalidText) {
          this.showError = true;
          this.$refs.numQuest.focus();
        } else if (this.titleIsInvalidText) {
          this.showError = true;
          this.$refs.title.focus();
        } else {
          this.$store.dispatch('examCreation/createExamAndRoute', this.classId).catch(error => {
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
      listKey(question) {
        return question.exercise_id + question.question_id;
      },
    },
    $trs: {
      title: 'Select questions',
      backLabel: 'Select topics or exercises',
      exercise: 'Exercise { num }',
      randomize: 'Choose a different set of questions',
      questionOrder: 'Question order',
      questions: 'Questions',
      newQuestions: 'New question set created',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

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
