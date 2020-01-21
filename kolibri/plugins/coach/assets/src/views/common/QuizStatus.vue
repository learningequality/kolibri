<template>

  <KPageContainer :topMargin="$isPrint ? 0 : 16">
    <KGrid gutter="16">
      <!-- Quiz Open button -->
      <div v-if="!exam.active && !exam.archive && !$isPrint" class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 8 }"
          :layout12="{ span: 12 }"
        >
          <KButton
            :primary="true"
            :text="coachString('openQuizLabel')"
            type="button"
            style="margin: 0;"
            @click="showConfirmationModal = true"
          />
        </KGridItem>
      </div>

      <!-- Quiz Close button & time since opened -->
      <div v-if="exam.active && !exam.archive && !$isPrint" class="status-item">
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          <KButton
            :text="coachString('closeQuizLabel')"
            type="submit"
            style="margin: 0;"
            :appearanceOverrides="cancelStyleOverrides"
            @click="showCancellationModal = true"
          />
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          <StatusElapsedTime
            :date="examDateOpened"
            actionType="opened"
            style="margin-top: 8px; display: block;"
          />
        </KGridItem>
      </div>

      <!-- Quiz Closed label & time since closed -->
      <div v-if="exam.archive && !$isPrint" class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          {{ coachString('quizClosedLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          <ElapsedTime :date="examDateArchived" style="margin-top: 8px;" />
        </KGridItem>
      </div>
      <div v-if="exam.archive && !$isPrint" class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          {{ $tr('reportVisibleToLearnersLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          <KSwitch
            name="toggle-quiz-visibility"
            style="display:inline;"
            :checked="exam.active"
            :value="exam.active"
            @change="handleToggleVisibility"
          />
        </KGridItem>
      </div>

      <!-- Class name  -->
      <div v-show="$isPrint" class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Label"
        >
          {{ coachString('classLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Value"
        >
          <div>
            {{ className }}
          </div>
        </KGridItem>
      </div>

      <!-- Recipients  -->
      <div class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Label"
        >
          {{ coachString('recipientsLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Value"
        >
          <div>
            <Recipients
              slot="value"
              :groupNames="groupAndAdHocLearnerNames"
              :hasAssignments="exam.assignments.length > 0"
            />
          </div>
        </KGridItem>
      </div>

      <!-- Average Score -->
      <div class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Label"
        >
          <span>{{ coachString('avgScoreLabel') }}</span>
          <AverageScoreTooltip v-show="!$isPrint" class="avg-score-info" />
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Value"
        >
          <Score :value="avgScore" />
        </KGridItem>
      </div>

      <!-- Question Order -->
      <div v-if="!$isPrint" class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          {{ $tr('questionOrderLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          {{ orderDescriptionString }}
        </KGridItem>
      </div>

    </KGrid>

    <KModal
      v-if="showConfirmationModal"
      :title="coachString('openQuizLabel')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @cancel="showConfirmationModal = false"
      @submit="handleOpenQuiz"
    >
      <div>{{ coachString('openQuizModalDetail') }}</div>
    </KModal>

    <KModal
      v-if="showCancellationModal"
      :title="coachString('closeQuizLabel')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @cancel="showCancellationModal = false"
      @submit="handleCloseQuiz"
    >
      <div>{{ coachString('closeQuizModalDetail') }}</div>
    </KModal>

  </KPageContainer>

</template>


<script>

  import { ExamResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import { coachStringsMixin } from './commonCoachStrings';
  import Score from './Score';
  import Recipients from './Recipients';
  import StatusElapsedTime from './StatusElapsedTime';
  import AverageScoreTooltip from './AverageScoreTooltip';

  export default {
    name: 'QuizStatus',
    components: { Score, Recipients, ElapsedTime, StatusElapsedTime, AverageScoreTooltip },
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      className: {
        type: String,
        required: true,
      },
      groupAndAdHocLearnerNames: {
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
          color: this.$themeTokens.textInverted,
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
      layout12Label() {
        return { span: this.$isPrint ? 3 : 12 };
      },
      layout12Value() {
        return { span: this.$isPrint ? 9 : 12 };
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
    font-size: 14px;

    @media print {
      font-size: inherit;
    }
  }

  .status-label {
    padding-bottom: 8px;
    font-weight: bold;

    @media print {
      padding-bottom: 0;
    }
  }

  .avg-score-info {
    margin-left: 8px;
  }

  .status-item {
    width: 100%;
    padding-top: 16px;

    @media print {
      padding-top: 10px;

      &:first-child {
        padding-top: 0;
      }
    }
  }

</style>
