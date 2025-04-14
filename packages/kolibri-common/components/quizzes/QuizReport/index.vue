<template>

  <MultiPaneLayout
    ref="multiPaneLayout"
    class="container"
  >
    <template #header>
      <KGrid
        class="page-status"
        :style="{ backgroundColor: $themeTokens.surface }"
      >
        <KGridItem
          v-if="windowIsSmall"
          :layout4="{ span: 4, alignment: 'right' }"
        >
          <slot name="actions"></slot>
        </KGridItem>
        <KGridItem
          :layout12="{ span: 9, alignment: 'left' }"
          :layout8="{ span: 5, alignment: 'left' }"
          :layout4="{ span: 4, alignment: 'left' }"
        >
          <div>
            <h1
              v-if="userId"
              class="title"
            >
              <KLabeledIcon
                icon="person"
                :label="userName"
              />
            </h1>
            <KLabeledIcon
              :icon="titleIcon"
              :label="title"
            />
          </div>
          <!-- only show the current try if the user has only one try or if its a survey -->
          <TriesOverview
            v-if="pastTries.length > 1 && !isSurvey"
            :pastTries="pastTries"
            :totalQuestions="questions.length"
            :suggestedTime="duration"
            :isSurvey="isSurvey"
          />
          <CurrentTryOverview
            v-else-if="currentTry"
            :userId="userId"
            :currentTry="currentTry"
            :totalQuestions="questions.length"
            :isSurvey="isSurvey"
          />
        </KGridItem>
        <KGridItem
          v-if="!windowIsSmall"
          :layout12="{ span: 3, alignment: 'right' }"
          :layout8="{ span: 3, alignment: 'right' }"
          :layout="{ span: 2, alignment: 'right' }"
        >
          <slot name="actions"></slot>
        </KGridItem>
      </KGrid>
    </template>

    <template
      v-if="!loading"
      #subheader
    >
      <KSelect
        v-if="pastTries.length > 1"
        :value="pastTriesOptions[tryIndex]"
        :label="$tr('attemptDropdownLabel')"
        :options="pastTriesOptions"
        :style="{ background: $themePalette.grey.v_200 }"
        appearance="flat-button"
        class="try-selection"
        @change="navigateToTry"
      />
      <CurrentTryOverview
        v-if="currentTry && pastTries.length > 1 && currentTry.attemptlogs.length"
        :userId="userId"
        :currentTry="currentTry"
        :totalQuestions="questions.length"
        :hideStatus="true"
        :isSurvey="isSurvey"
      />
    </template>

    <template
      v-if="!windowIsSmall && !loading && currentTry && currentTry.attemptlogs.length"
      #aside
    >
      <AttemptLogList
        :attemptLogs="attemptLogs"
        :selectedQuestionNumber="questionNumber"
        :isSurvey="isSurvey"
        :sections="annotatedSections"
        :currentSectionIndex="currentSectionIndex"
        @select="navigateToQuestion"
      />
    </template>

    <template
      v-if="currentTry && currentTry.attemptlogs.length"
      #main
    >
      <KCircularLoader
        v-if="loading"
        class="loader"
      />
      <template v-else-if="itemId">
        <AttemptLogList
          v-if="windowIsSmall"
          class="mobile-attempt-log-list"
          :isMobile="true"
          :attemptLogs="attemptLogs"
          :selectedQuestionNumber="questionNumber"
          :isSurvey="isSurvey"
          :sections="annotatedSections"
          :currentSectionIndex="currentSectionIndex"
          @select="navigateToQuestion"
        />
        <div
          v-if="exercise && exercise.available"
          class="exercise-container"
          :class="windowIsSmall ? 'mobile-exercise-container' : ''"
          :style="{ backgroundColor: $themeTokens.surface }"
        >
          <h3 v-if="questionNumberInSectionLabel">{{ questionNumberInSectionLabel }}</h3>

          <p v-if="currentSection && currentSection.description">
            {{ currentSection.description }}
          </p>

          <div
            v-if="!isSurvey"
            data-test="diff-business"
          >
            <KCheckbox
              :label="coreString('showCorrectAnswerLabel')"
              :checked="showCorrectAnswer"
              @change="toggleShowCorrectAnswer"
            />
            <div
              v-if="currentAttemptDiff"
              style="padding-bottom: 15px"
            >
              <AttemptIconDiff
                :correct="currentAttempt.correct"
                :diff="currentAttemptDiff.correct"
              />
              <AttemptTextDiff
                :userId="userId"
                :correct="currentAttempt.correct"
                :diff="currentAttemptDiff.correct"
              />
            </div>
            <InteractionList
              v-if="!showCorrectAnswer"
              :interactions="currentInteractionHistory"
              :selectedInteractionIndex="selectedInteractionIndex"
              @select="navigateToQuestionAttempt"
            />
          </div>
          <ContentRenderer
            :itemId="renderableItemId"
            :allowHints="false"
            :kind="exercise.kind"
            :files="exercise.files"
            :available="exercise.available"
            :extraFields="exercise.extra_fields"
            :interactive="false"
            :assessment="true"
            :answerState="answerState"
            :showCorrectAnswer="showCorrectAnswer"
          />
        </div>
        <MissingResourceAlert
          v-else
          :multiple="false"
        />
      </template>

      <p v-else>
        {{ $tr('noItemId') }}
      </p>
    </template>
  </MultiPaneLayout>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import isFinite from 'lodash/isFinite';
  import isNumber from 'lodash/isNumber';
  import isString from 'lodash/isString';
  import InteractionList from 'kolibri-common/components/quizzes/InteractionList';
  import find from 'lodash/find';
  import MultiPaneLayout from 'kolibri-common/components/MultiPaneLayout';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import MasteryLogResource from 'kolibri-common/apiResources/MasteryLogResource';
  import { now } from 'kolibri/utils/serverClock';
  import { annotateSections } from 'kolibri-common/quizzes/utils';
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert';
  import { displaySectionTitle } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import AttemptLogList from './AttemptLogList';
  import AttemptTextDiff from './AttemptTextDiff';
  import AttemptIconDiff from './AttemptIconDiff';
  import TriesOverview from './TriesOverview';
  import CurrentTryOverview from './CurrentTryOverview';

  export default {
    name: 'QuizReport',
    components: {
      AttemptLogList,
      InteractionList,
      MultiPaneLayout,
      AttemptIconDiff,
      AttemptTextDiff,
      TriesOverview,
      CurrentTryOverview,
      MissingResourceAlert,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    props: {
      // Unique identifier of the item for the report
      // this will be used to filter for previous tries
      contentId: {
        type: String,
        required: true,
      },
      // The title of the item
      title: {
        type: String,
        required: true,
      },
      // The suggested duration of the item in seconds
      duration: {
        type: Number,
        default: null,
      },
      // The user id of the user for the report
      // Let it be null to handle anonymous users
      // with just the title and action bar.
      userId: {
        type: String,
        default: null,
      },
      // The name of the user for the report
      userName: {
        type: String,
        required: true,
      },
      // Which specific interaction within an attempt to show
      selectedInteractionIndex: {
        type: Number,
        required: true,
      },
      // Which specific question within a try to show
      // A zero based index
      // For quiz type assessments, this is the specific question number
      // For exercise type assessments, 0 is the most recent attempt in the try
      questionNumber: {
        type: Number,
        required: true,
      },
      // Which 'try' to show - this is a zero based index with 0 being the most recent.
      // To the user we describe this as an 'attempt' but to avoid confusion with the
      // attempt logs that describe a users interaction with a specific question, we
      // refer to this as a 'try'
      tryIndex: {
        type: Number,
        default: 0,
      },
      // An object containing all of the content metadata for the item.
      // We allow this to be empty to accommodate missing resources
      exercise: {
        type: Object,
        default: null,
      },
      // A function that has the signature tryIndex, questionNumber, interactionIndex
      // this should handle changes to the three parameters above.
      navigateTo: {
        type: Function,
        required: true,
      },
      // The exam.question_sources value
      sections: {
        type: Array,
        required: false,
        default: null,
      },
      // An array of questions in the format:
      // {
      //   exercise_id: <exercise_id>,
      //   question_id: <item id for question>,
      //   title: <title to use when displaying the question>,
      //   counter_in_exercise: <zero based index of question in exercise>,
      //   item: <a unique identifier for the question>
      // }
      // The question_id and item are identical for non-coach assigned/generated quizzes
      // for coach generated quizzes, we currently use a concatenation of the exercise_id
      // and question_id in order to generate a globally unique item identifier:
      // <exercise_id>:<question_id>
      // in case two exercises have a colliding question_id.
      // For exercises and practice quizzes there is no risk of collision, so this is not done.
      questions: {
        type: Array,
        required: true,
        validator: questions => {
          return questions.every(question => {
            return (
              isString(question.exercise_id) &&
              isString(question.question_id) &&
              isNumber(question.counter_in_exercise) &&
              isString(question.title) &&
              isString(question.item)
            );
          });
        },
      },
      // An array containing all of the content metadata for the item.
      // Note: this is only really needed for coach assigned quizzes
      // for exercises and practice quizzes, this is just the exercise prop
      // wrapped in an array.
      // TODO: Add general purpose content node validator here.
      exerciseContentNodes: {
        type: Array,
        default: () => [],
      },
      // Is this a coach assigned quiz or a practice quiz?
      // This is used to determine the ordering of displayed attempts
      // For quizzes it's by question number, for non-quizzes it's by most recent attempt
      // and whether to show non-attempted questions.
      isQuiz: {
        type: Boolean,
        default: true,
      },
      // Is this.content a survey modality?
      isSurvey: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        showCorrectAnswer: false,
        now: now(),
        pastTries: [],
        currentTry: null,
        loading: true,
      };
    },
    computed: {
      annotatedSections() {
        return annotateSections(this.sections, this.questions);
      },
      currentSectionIndex() {
        return this.annotatedSections.findIndex(
          section =>
            this.questionNumber >= section.startQuestionNumber &&
            this.questionNumber <= section.endQuestionNumber,
        );
      },
      currentSection() {
        return this.annotatedSections[this.currentSectionIndex];
      },
      questionNumberInSectionLabel() {
        const questionLabel = this.coreString('questionNumberLabel', {
          questionNumber: this.questionNumber + 1,
        });
        if (this.annotatedSections.length === 1) {
          return questionLabel;
        }
        const sectionLabel = displaySectionTitle(this.currentSection, this.currentSectionIndex);
        return `${sectionLabel} - ${questionLabel}`;
      },
      attemptLogs() {
        if (this.isQuiz || this.isSurvey) {
          return this.quizAttempts();
        }
        return this.masteryAttempts();
      },
      answerState() {
        // Do not pass in answerState if showCorrectAnswer is set to true
        // answerState has a precedence over showCorrectAnswer
        if (
          !this.showCorrectAnswer &&
          this.currentInteraction &&
          this.currentInteraction.type === 'answer'
        ) {
          return this.currentInteraction.answer;
        }
        return null;
      },
      currentAttempt() {
        return this.attemptLogs.find(a => a.item === this.itemId);
      },
      currentAttemptDiff() {
        return this.currentAttempt &&
          this.currentAttempt.diff &&
          this.currentAttempt.diff.correct !== null
          ? this.currentAttempt.diff
          : null;
      },
      pastTriesOptions() {
        return this.pastTries.map((quizTry, index) => {
          const rawScore = quizTry.correct / this.questions.length;
          const score = this.$formatNumber(rawScore, { style: 'percent' });
          const time = this.$formatRelative(quizTry.completion_timestamp || quizTry.end_timestamp, {
            now: this.now,
          });

          return {
            value: index,
            label: this.isSurvey ? time : `(${score}) ${time}`,
          };
        });
      },
      itemId() {
        return this.isQuiz || this.isSurvey
          ? this.questions[this.questionNumber].item
          : this.attemptLogs[this.questionNumber].item;
      },
      renderableItemId() {
        // This item value is used to pass into ContentRenderer to set the correct question,
        // so reclaim the actual item id value here by splitting on ':'.
        // This is only needed in cases where the item id has been artificially generated for coach
        // assigned quizzes.
        return this.itemId.split(':')[1] || this.itemId;
      },
      currentInteractionHistory() {
        // filter out interactions without answers but keep hints and errors
        return this.currentAttempt
          ? this.currentAttempt.interaction_history.filter(interaction =>
            Boolean(
              interaction.answer || interaction.type === 'hint' || interaction.type === 'error',
            ),
          ) || []
          : [];
      },
      currentInteraction() {
        return (
          this.currentInteractionHistory &&
          this.currentInteractionHistory[this.selectedInteractionIndex]
        );
      },
      titleIcon() {
        if (this.isSurvey) {
          return 'reflectSolid';
        }
        return this.isQuiz ? 'quiz' : this.exercise.kind;
      },
    },
    watch: {
      tryIndex(newVal, oldVal) {
        if (newVal !== oldVal) {
          this.loadAttempts();
        }
      },
    },
    created() {
      if (this.userId) {
        this.loadAttempts();
        this.loadAllTries();
      }
    },
    methods: {
      navigateToQuestion(questionNumber) {
        if (questionNumber !== this.questionNumber) {
          this.navigateTo(this.tryIndex, questionNumber, 0);
          this.$refs.multiPaneLayout.scrollMainToTop();
          this.showCorrectAnswer = false;
        }
      },
      navigateToQuestionAttempt(interaction) {
        if (interaction !== this.selectedInteractionIndex) {
          this.navigateTo(this.tryIndex, this.questionNumber, interaction);
          this.$refs.multiPaneLayout.scrollMainToTop();
          this.showCorrectAnswer = false;
        }
      },
      navigateToTry(tryOption) {
        if (tryOption.value !== this.tryIndex) {
          this.navigateTo(tryOption.value, 0, 0);
          this.$refs.multiPaneLayout.scrollMainToTop();
          this.showCorrectAnswer = false;
        }
      },
      toggleShowCorrectAnswer() {
        this.showCorrectAnswer = !this.showCorrectAnswer;
        this.$forceUpdate();
      },
      getParams() {
        return {
          content: this.contentId,
          user: this.userId,
          back: this.tryIndex,
          quiz: this.isQuiz,
        };
      },
      loadAttempts() {
        if (!isFinite(this.tryIndex)) {
          return;
        }
        this.loading = true;
        MasteryLogResource.fetchMostRecentDiff(this.getParams())
          .then(currentTry => {
            this.currentTry = currentTry;
            this.loading = false;
          })
          .catch(err => {
            if (err.response && err.response.status_code === 404) {
              this.$emit('noCompleteTries');
            }
            this.loading = false;
          });
      },
      loadAllTries() {
        MasteryLogResource.fetchCollection({ getParams: this.getParams(), force: true }).then(
          pastTries => {
            this.pastTries = pastTries;
          },
        );
      },
      quizAttempts() {
        const mostRecentAttempts = sortBy(
          this.currentTry ? this.currentTry.attemptlogs : [],
          'end_timestamp',
        ).reverse();
        return sortBy(
          this.questions.map((question, index) => {
            const attempt = mostRecentAttempts.find(a => a.item === question.item);
            const questionNumber = index + 1;
            const noattempt = !attempt;
            let num_coach_contents;
            let missing_resource = true;
            if (this.exerciseContentNodes.length) {
              const exerciseId = this.questions[questionNumber - 1].exercise_id;
              const exerciseMatch = find(this.exerciseContentNodes, { id: exerciseId });
              if (exerciseMatch) {
                num_coach_contents = exerciseMatch.num_coach_contents;
                missing_resource = false;
              }
            }
            return {
              ...(attempt || {}),
              noattempt,
              questionNumber,
              num_coach_contents,
              missing_resource,
            };
          }),
          'questionNumber',
        );
      },
      masteryAttempts() {
        return sortBy(this.currentTry ? this.currentTry.attemptlogs : [], 'end_timestamp')
          .reverse()
          .map(attempt => {
            const questionNumber = this.questions.findIndex(q => q.item === attempt.item) + 1;
            let num_coach_contents;
            let missing_resource = true;
            if (this.exerciseContentNodes.length) {
              const exerciseId = this.questions[questionNumber - 1].exercise_id;
              const exerciseMatch = find(this.exerciseContentNodes, { id: exerciseId });
              if (exerciseMatch) {
                num_coach_contents = exerciseMatch.num_coach_contents;
                missing_resource = false;
              }
            }
            return {
              ...attempt,
              questionNumber,
              num_coach_contents,
              missing_resource,
            };
          });
      },
    },
    $trs: {
      noItemId: {
        message: 'This question has an error, please move on to the next question',
        context:
          'Message that a coach would see in a report that indicates that there is an error in one of the questions in a quiz.',
      },
      attemptDropdownLabel: {
        message: 'Attempt',
        context:
          'Label in the dropdown menu where one can choose an attempt from their five most recent attempts at a practice quiz',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .exercise-container {
    padding: 8px;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
    background-color: white;
  }

  .mobile-exercise-container {
    margin-top: 16px;
  }

  .mobile-attempt-log-list {
    margin-top: 16px;
  }

  h3 {
    margin-top: 0;
  }

  .try-selection {
    max-width: 400px;
    padding: 8px 8px 0;
    margin-top: 16px;
  }

  .loader {
    padding-top: 64px;
    padding-bottom: 64px;
  }

  th {
    text-align: left;
  }

  th,
  td {
    height: 2em;
    padding-right: 24px;
    font-size: 14px;
  }

</style>
