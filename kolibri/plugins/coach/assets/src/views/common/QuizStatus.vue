<template>

  <KPageContainer :topMargin="$isPrint ? 0 : 16">
    <KGrid gutter="16">
      <!-- Quiz Open button -->
      <div
        v-if="!exam.active && !exam.archive && !$isPrint"
        class="status-item"
      >
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
            @click="showConfirmationModal = true"
          />
        </KGridItem>
      </div>

      <!-- Quiz Close button & time since opened -->
      <div
        v-if="exam.active && !exam.archive && !$isPrint"
        class="status-item"
      >
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          <KButton
            :text="coachString('closeQuizLabel')"
            type="submit"
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
            style="display: block; margin-top: 8px"
          />
        </KGridItem>
      </div>

      <!-- Quiz Closed label & time since closed -->
      <div
        v-if="exam.archive && !$isPrint"
        class="status-item"
      >
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
          <ElapsedTime
            :date="examDateArchived"
            style="margin-top: 8px"
          />
        </KGridItem>
      </div>
      <div
        v-if="exam.archive && !$isPrint"
        class="status-item"
      >
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
            label=""
            style="display: inline"
            :checked="exam.active"
            :value="exam.active"
            @change="handleToggleVisibility"
          />
        </KGridItem>
      </div>

      <!-- Class name  -->
      <div
        v-show="$isPrint"
        class="status-item"
      >
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
          <AverageScoreTooltip
            v-show="!$isPrint"
            class="avg-score-info"
          />
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
      <div
        v-if="!$isPrint"
        class="status-item"
      >
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          {{ sectionOrderLabel$() }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          {{ orderDescriptionString }}
        </KGridItem>
      </div>

      <!-- quiz size -->
      <div
        v-if="!$isPrint"
        class="status-item"
      >
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          {{ coachString('sizeLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 12 }"
        >
          <p>{{ exam.size_string ? exam.size_string : '--' }}</p>
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
      <p>{{ coachString('openQuizModalDetail') }}</p>
      <p>{{ coachString('lodQuizDetail') }}</p>
      <p>{{ coachString('fileSizeToDownload', { size: exam.size_string }) }}</p>
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

    <KModal
      v-if="showRemoveReportVisibilityModal"
      :title="coachString('makeQuizReportNotVisibleTitle')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @cancel="showRemoveReportVisibilityModal = false"
      @submit="makeQuizInactive(exam)"
    >
      <p>{{ coachString('makeQuizReportNotVisibleText') }}</p>
      <p>{{ coachString('fileSizeToRemove', { size: exam.size_string }) }}</p>
      <KCheckbox
        :checked="dontShowAgainChecked"
        :label="coachString('dontShowAgain')"
        @change="dontShowAgainChecked = $event"
      />
    </KModal>
    <KModal
      v-if="showMakeReportVisibleModal"
      :title="coachString('makeQuizReportVisibleTitle')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @cancel="showMakeReportVisibleModal = false"
      @submit="makeQuizInactive(exam)"
    >
      <p>{{ coachString('makeQuizReportVisibleText') }}</p>
      <p>{{ coachString('fileSizeToDownload', { size: exam.size_string }) }}</p>
      <KCheckbox
        :checked="dontShowAgainChecked"
        :label="coachString('dontShowAgain')"
        @change="dontShowAgainChecked = $event"
      />
    </KModal>
  </KPageContainer>

</template>


<script>

  import { ExamResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import Lockr from 'lockr';
  import { QUIZ_REPORT_VISIBILITY_MODAL_DISMISSED } from 'kolibri.coreVue.vuex.constants';
  import { mapActions } from 'vuex';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import useSnackbar from 'kolibri.coreVue.composables.useSnackbar';
  import { coachStringsMixin } from './commonCoachStrings';
  import Score from './Score';
  import Recipients from './Recipients';
  import StatusElapsedTime from './StatusElapsedTime';
  import AverageScoreTooltip from './AverageScoreTooltip';

  export default {
    name: 'QuizStatus',
    components: { Score, Recipients, ElapsedTime, StatusElapsedTime, AverageScoreTooltip },
    mixins: [coachStringsMixin, commonCoreStrings],
    setup() {
      const { sectionOrderLabel$ } = enhancedQuizManagementStrings;
      const { createSnackbar } = useSnackbar();
      return { sectionOrderLabel$, createSnackbar };
    },
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
        default: null,
      },
    },
    data() {
      return {
        showConfirmationModal: false,
        showCancellationModal: false,
        showRemoveReportVisibilityModal: false,
        showMakeReportVisibleModal: false,
        dontShowAgainChecked: false,
        learnOnlyDevicesExist: false,
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
          'background-color': this.$themePalette.red.v_1100,
          ':hover': { 'background-color': this.$darken1(this.$themePalette.red.v_1100) },
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
    mounted() {
      this.checkIfAnyLODsInClass();
    },
    methods: {
      ...mapActions(['fetchUserSyncStatus']),
      handleOpenQuiz() {
        const promise = ExamResource.saveModel({
          id: this.$route.params.quizId,
          data: {
            active: true,
            draft: false,
          },
          exists: true,
        });

        return promise
          .then(data => {
            this.showConfirmationModal = false;
            this.createSnackbar(this.coachString('quizOpenedMessage'));
            if (data.id !== this.$route.params.quizId) {
              this.$router.replace({
                name: this.$route.name,
                params: {
                  ...this.$route.params,
                  quizId: data.id,
                },
              });
            } else {
              this.$store.dispatch('classSummary/refreshClassSummary');
            }
          })
          .catch(() => {
            this.createSnackbar(this.coachString('quizFailedToOpenMessage'));
          });
      },
      handleCloseQuiz() {
        const promise = ExamResource.saveModel({
          id: this.$route.params.quizId,
          data: {
            archive: true,
          },
          exists: true,
        });

        return promise
          .then(() => {
            this.$store.dispatch('classSummary/refreshClassSummary');
            this.showCancellationModal = false;
            this.createSnackbar(this.coachString('quizClosedMessage'));
          })
          .catch(() => {
            this.createSnackbar(this.coachString('quizFailedToCloseMessage'));
          });
      },
      // modal about quiz report size should only exist of LODs exist in the class
      // which we are checking via if there have recently been any user syncs
      // TODO: refactor to a more robust check
      checkIfAnyLODsInClass() {
        this.fetchUserSyncStatus({ member_of: this.$route.params.classId }).then(data => {
          if (data && data.length > 0) {
            this.learnOnlyDevicesExist = true;
          }
        });
      },
      handleToggleVisibility() {
        // has the user set their preferences to not have a modal confirmation?
        const hideModalConfirmation = Lockr.get(QUIZ_REPORT_VISIBILITY_MODAL_DISMISSED);
        if (!hideModalConfirmation && this.learnOnlyDevicesExist) {
          if (this.exam.active) {
            this.showRemoveReportVisibilityModal = true;
            this.showMakeReportVisibleModal = false;
          } else {
            this.showMakeReportVisibleModal = true;
            this.showRemoveReportVisibilityModal = false;
          }
        } else {
          // proceed with visibility changes withhout the modal
          this.makeQuizInactive(this.exam);
        }
      },
      makeQuizInactive() {
        if (this.dontShowAgainChecked) {
          Lockr.set(QUIZ_REPORT_VISIBILITY_MODAL_DISMISSED, true);
        }
        const newActiveState = !this.exam.active;
        const snackbarMessage = newActiveState
          ? this.coachString('quizVisibleToLearners')
          : this.coachString('quizNotVisibleToLearners');

        const promise = ExamResource.saveModel({
          id: this.$route.params.quizId,
          data: {
            active: newActiveState,
          },
          exists: true,
        });

        return promise.then(() => {
          this.$store.dispatch('classSummary/refreshClassSummary');
          this.showConfirmationModal = false;
          this.showRemoveReportVisibilityModal = false;
          this.showMakeReportVisibleModal = false;
          this.createSnackbar(snackbarMessage);
        });
      },
    },
    $trs: {
      reportVisibleToLearnersLabel: {
        message: 'Report visible to learners',
        context:
          'The label for a switch that will toggle whether or not learners can view their quiz report.',
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
