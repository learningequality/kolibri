<template>

  <KPageContainer>
    <KButton
      v-if="!exam.active && !exam.archive"
      :primary="true"
      :text="$tr('openQuizLabel')"
      type="button"
      style="margin-left: 0; margin-top: 1rem; margin-bottom: 0;"
      @click="showConfirmationModal = true"
    />
    <div v-if="exam.active && !exam.archive" style="margin-bottom: 2.5rem;">
      <KButton
        :text="$tr('closeQuizLabel')"
        type="submit"
        style="margin-left: 0; margin-top: 1rem; margin-bottom: 0;"
        :appearanceOverrides="cancelStyleOverrides"
        @click="showCancellationModal = true"
      />
      <StatusElapsedTime :date="examDateOpened" actionType="opened" />
    </div>
    <dl>
      <dt v-if="exam.archive">
        <b>{{ $tr('quizClosedLabel') }}</b>
      </dt>
      <dd v-if="exam.archive" style="margin-bottom: 2.5rem;">
        <StatusElapsedTime :date="examDateArchived" />
      </dd>
      <dt v-if="exam.archive">
        <b>{{ $tr('reportVisibleToLearnersLabel') }}</b>
      </dt>
      <dd v-if="exam.archive">
        <KSwitch
          name="toggle-quiz-visibility"
          :checked="exam.active"
          :value="exam.active"
          :label="$tr('yesLabel')"
          @change="handleToggleVisibility"
        />

      </dd>
      <dt>
        <b>{{ coachString('recipientsLabel') }}</b>
      </dt>
      <dd>
        <Recipients
          slot="value"
          :groupNames="groupNames"
          :hasAssignments="exam.assignments.length > 0"
        />
      </dd>
      <dt>
        <b style="position: relative;">
          <span>{{ coachString('avgScoreLabel') }}</span>
          <AverageScoreTooltip />
        </b>

      </dt>
      <dd>
        <Score :value="avgScore" />
      </dd>
      <dt>
        <b>{{ $tr('questionOrderLabel') }} </b>
      </dt>
      <dd>{{ orderDescriptionString }}</dd>
    </dl>
    <QuizStatusModal
      v-if="showConfirmationModal"
      :modalHeader="$tr('openQuizLabel')"
      :modalDetail="$tr('openQuizModalDetail')"
      @cancel="showConfirmationModal = false"
      @submit="handleOpenQuiz"
    />
    <QuizStatusModal
      v-if="showCancellationModal"
      :modalHeader="$tr('closeQuizLabel')"
      :modalDetail="$tr('closeQuizModalDetail')"
      @cancel="showCancellationModal = false"
      @submit="handleCloseQuiz"
    />
  </KPageContainer>

</template>


<script>

  import { ExamResource } from 'kolibri.resources';
  import { coachStringsMixin } from './commonCoachStrings';
  import Score from './Score';
  import Recipients from './Recipients';
  import QuizStatusModal from './QuizStatusModal';
  import StatusElapsedTime from './StatusElapsedTime';
  import AverageScoreTooltip from './AverageScoreTooltip';

  export default {
    name: 'QuizStatus',
    components: { Score, Recipients, QuizStatusModal, StatusElapsedTime, AverageScoreTooltip },
    mixins: [coachStringsMixin],
    props: {
      groupNames: {
        type: Array,
        required: true,
      },
      exam: {
        type: Object,
        required: true,
      },
      avgScore: {
        type: Number,
        required: false,
      },
    },
    data() {
      return {
        showConfirmationModal: false,
        showCancellationModal: false,
      };
    },
    computed: {
      orderDescriptionString() {
        return this.exam.learners_see_fixed_order
          ? this.coachString('orderFixedLabel')
          : this.coachString('orderRandomLabel');
      },
      cancelStyleOverrides() {
        return {
          color: '#fff',
          'background-color': this.$themePalette.red.v_700,
          ':hover': { 'background-color': this.$themePalette.red.v_900 },
        };
      },
      examDateArchived() {
        if (this.exam.date_archived) {
          return new Date(this.exam.date_archived);
        } else {
          return null;
        }
      },
      examDateOpened() {
        if (this.exam.date_activated) {
          return new Date(this.exam.date_activated);
        } else {
          return null;
        }
      },
    },
    methods: {
      handleOpenQuiz() {
        let promise = ExamResource.saveModel({
          id: this.$route.params.quizId,
          data: {
            active: true,
            date_activated: new Date(),
          },
          exists: true,
        });

        return promise
          .then(() => {
            this.$store.dispatch('classSummary/refreshClassSummary');
            this.showConfirmationModal = false;
            this.$store.dispatch('createSnackbar', this.$tr('quizOpenedMessage'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.$tr('quizFailedToOpenMessage'));
          });
      },
      handleCloseQuiz() {
        let promise = ExamResource.saveModel({
          id: this.$route.params.quizId,
          data: {
            archive: true,
            date_archived: new Date(),
          },
          exists: true,
        });

        return promise
          .then(() => {
            this.$store.dispatch('classSummary/refreshClassSummary');
            this.showCancellationModal = false;
            this.$store.dispatch('createSnackbar', this.$tr('quizClosedMessage'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.$tr('quizFailedToCloseMessage'));
          });
      },
      handleToggleVisibility() {
        const newActiveState = !this.exam.active;
        const snackbarMessage = newActiveState
          ? this.$tr('quizVisibleToLearners')
          : this.$tr('quizNotVisibleToLearners');

        let promise = ExamResource.saveModel({
          id: this.$route.params.quizId,
          data: {
            active: newActiveState,
          },
          exists: true,
        });

        return promise.then(() => {
          this.$store.dispatch('classSummary/refreshClassSummary');
          this.showConfirmationModal = false;
          this.$store.dispatch('createSnackbar', snackbarMessage);
        });
      },
    },
    $trs: {
      quizOpenedMessage: {
        message: 'Quiz is open',
        context:
          'A brief snackbar message notifying the user that the quiz was successfully opened.',
      },
      quizFailedToOpenMessage: {
        message: 'There was a problem opening the quiz. The quiz was not opened.',
        context:
          'A brief snackbar message notifying the user that there was an error trying to open the quiz and that the quiz is not open.',
      },
      quizClosedMessage: {
        message: 'Quiz is closed',
        context:
          'A brief snackbar message notifying the user that the quiz was successfully closed.',
      },
      quizFailedToCloseMessage: {
        message: 'There was a problem closing the quiz. The quiz was not closed.',
        context:
          'A brief snackbar message notifying the user that there was an error trying to close the quiz and that the quiz is not closed.',
      },
      quizVisibleToLearners: {
        message: 'Quiz report is visible to learners',
        context:
          'A brief snackbar message notifying the user that learners may view their quiz report. It will show when the user changes a setting to make the quiz visible.',
      },
      quizNotVisibleToLearners: {
        message: 'Quiz report is not visible to learners',
        context:
          'A brief snackbar message notifying the user that learners may no longer view their quiz report. It will show when the user changes a setting to make the quiz no longer visible.',
      },
      openQuizLabel: {
        message: 'Open quiz',
        context:
          "Label for a button that, when clicked, will 'open' a quiz - making it active so that Learners may take the quiz.",
      },
      openQuizModalDetail: {
        message:
          'Opening the quiz will make it visible to learners and they will be able to answer questions',
        context:
          "Text shown on a modal pop-up window when the user clicks the 'Open Quiz' button. This explains what will happen when the user confirms the action of opening the quiz.",
      },
      closeQuizLabel: {
        message: 'Close quiz',
        context:
          "Label for a button that, when clicked, will 'close' a quiz. This makes the quiz inactive and Learners will no longer be able to give answers.",
      },
      closeQuizModalDetail: {
        message:
          'All learners will be given a final score and a quiz report. Unfinished questions will be counted as incorrect.',
        context:
          "Text shown on a modal pop-up window when the user clicks the 'Close Quiz' button. This explains what will happen when the modal window is confirmed.",
      },
      quizClosedLabel: {
        message: 'Quiz closed',
        context:
          'A label indicating that the currently viewed quiz is closed - meaning that learners may no longer give answers to the quiz.',
      },
      reportVisibleToLearnersLabel: {
        message: 'Report visible to learners',
        context:
          'The label for a switch that will toggle whether or not learners can view their quiz report.',
      },

      questionOrderLabel: {
        message: 'Question order',
        context: 'A label for the place where the question order is shown.',
      },
      yesLabel: {
        message: 'Yes',
        context: "Used to indicate to the user when a switch element has a true or 'on' value.",
      },
    },
  };

</script>


<style scoped lang="scss">

  dt {
    margin-top: 1rem;
    margin-left: 0;
  }
  dd {
    margin: 0;
  }
  div {
    font-size: 0.925rem;
  }

</style>
