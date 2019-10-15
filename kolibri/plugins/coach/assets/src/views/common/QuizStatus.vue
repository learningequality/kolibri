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
    <KButton
      v-if="exam.active && !exam.archive"
      :text="$tr('closeQuizLabel')"
      type="submit"
      style="margin-left: 0; margin-top: 1rem; margin-bottom: 0;"
      :appearanceOverrides="cancelStyleOverrides"
      @click="showCancellationModal = true"
    />
    <dl>
      <dt v-if="exam.archive">
        <b>{{ $tr('quizClosedLabel') }}</b>
      </dt>
      <dd v-if="exam.archive" style="margin-bottom: 2.5rem;">
        <StatusElapsedTime :date="examDateArchived" />
      </dd>
      <dt v-if="exam.archive">
        <b>{{ $tr('reportVisibleLabel') }}</b>
      </dt>
      <dd v-if="exam.archive">
        ==() Yes
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
        <b>Average score</b>
      </dt>
      <dd>
        <Score :value="avgScore" />
      </dd>
      <dt>
        <b>Question order</b>
      </dt>
      <dd>{{ orderDescriptionString }}</dd>
    </dl>
    <QuizStatusModal
      v-if="showConfirmationModal"
      :modalHeader="$tr('openQuizLabel')"
      :modalDetail="$tr('openQuizModalDetail')"
      @cancel="showConfirmationModal = false"
      @submit="openQuiz"
    />
    <QuizStatusModal
      v-if="showCancellationModal"
      :modalHeader="$tr('closeQuizLabel')"
      :modalDetail="$tr('closeQuizModalDetail')"
      @cancel="showCancellationModal = false"
      @submit="closeQuiz"
    />
  </KPageContainer>

</template>

<script>

  import { coachStringsMixin } from './commonCoachStrings';
  import Score from './Score';
  import Recipients from './Recipients';
  import QuizStatusModal from './QuizStatusModal';
  import StatusElapsedTime from './StatusElapsedTime';

  export default {
    name: 'QuizStatus',
    components: { Score, Recipients, QuizStatusModal, StatusElapsedTime },
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
          'background-color': '#f00',
          ':hover': { 'background-color': '#f66' },
        };
      },
      examDateArchived() {
        if (this.exam.date_archived) {
          return new Date(this.exam.date_archived);
        } else {
          return null;
        }
      },
    },
    $trs: {
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
      reportVisibleLabel: {
        message: 'Report visible to learners',
        context:
          'The label for a switch that will toggle whether or not learners can view their quiz report.',
      },
    },
  };

</script>

<style scoped lang='scss'>

  dt {
    margin-top: 1.5rem;
    margin-left: 0;
  }
  dd {
    margin: 0;
  }
  div {
    font-size: 0.925rem;
  }

</style>
