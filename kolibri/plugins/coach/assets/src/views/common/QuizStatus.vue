<template>

  <KPageContainer>
    <KButton
      v-if="!exam.active && !exam.archive"
      :primary="true"
      :text="coachString('openQuizLabel')"
      type="button"
      style="margin-left: 0; margin-top: 1rem; margin-bottom: 0;"
      @click="showConfirmationModal = true"
    />
    <div v-if="exam.active && !exam.archive">
      <KButton
        :text="coachString('closeQuizLabel')"
        type="submit"
        style="margin-left: 0; margin-top: 1rem; margin-bottom: 0;"
        :appearanceOverrides="cancelStyleOverrides"
        @click="showCancellationModal = true"
      />
      <StatusElapsedTime :date="examDateOpened" actionType="opened" />
    </div>
    <KGrid gutter="16">
      <KGridItem v-if="exam.archive" class="status-label">
        {{ coachString('quizClosedLabel') }}
      </KGridItem>
      <KGridItem style="margin-bottom: 1rem">
        <StatusElapsedTime :date="examDateArchived" />
      </KGridItem>
      <KGridItem v-if="exam.archive" class="status-label" :layout12="{ span: 8 }">
        {{ $tr('reportVisibleToLearnersLabel') }}
      </KGridItem>
      <KGridItem v-if="exam.archive" class="status-label" :layout12="{ span: 4 }">
        <KSwitch
          name="toggle-quiz-visibility"
          style="display:inline;"
          :checked="exam.active"
          :value="exam.active"
          @change="handleToggleVisibility"
        />
      </KGridItem>
      <KGridItem class="status-label">
        {{ coachString('recipientsLabel') }}
      </KGridItem>
      <KGridItem>
        <div>
          <Recipients
            slot="value"
            :groupNames="groupNames"
            :hasAssignments="exam.assignments.length > 0"
          />
        </div>
      </KGridItem>
      <KGridItem class="status-label">
        <span>{{ coachString('avgScoreLabel') }}</span>
        <AverageScoreTooltip />
      </KGridItem>
      <KGridItem>
        <Score :value="avgScore" />
      </KGridItem>
      <KGridItem class="status-label">
        {{ $tr('questionOrderLabel') }}
      </KGridItem>
      <KGridItem>
        {{ orderDescriptionString }}
      </KGridItem>

    </KGrid>
    <QuizStatusModal
      v-if="showConfirmationModal"
      :modalHeader="coachString('openQuizLabel')"
      :modalDetail="coachString('openQuizModalDetail')"
      @cancel="showConfirmationModal = false"
      @submit="handleOpenQuiz"
    />
    <QuizStatusModal
      v-if="showCancellationModal"
      :modalHeader="coachString('closeQuizLabel')"
      :modalDetail="coachString('closeQuizModalDetail')"
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
            this.$store.dispatch('createSnackbar', this.coachString('quizOpenedMessage'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.coachString('quizFailedToOpenMessage'));
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
            this.$store.dispatch('createSnackbar', this.coachString('quizClosedMessage'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.coachString('quizFailedToCloseMessage'));
          });
      },
      handleToggleVisibility() {
        const newActiveState = !this.exam.active;
        const snackbarMessage = newActiveState
          ? this.coachString('quizVisibleToLearners')
          : this.coachString('quizNotVisibleToLearners');

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
      reportVisibleToLearnersLabel: {
        message: 'Report visible to learners',
        context:
          'The label for a switch that will toggle whether or not learners can view their quiz report.',
      },
      questionOrderLabel: {
        message: 'Question order',
        context: 'A label for the place where the question order is shown.',
      },
    },
  };

</script>


<style scoped lang="scss">

  .grid-item {
    font-size: 0.925rem;
  }
  .status-label {
    padding-top: 1.5rem;
    font-weight: bold;
  }

</style>
