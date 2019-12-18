<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <PlanHeader />

      <div class="filter-and-button">
        <!-- Hidden temporarily per https://github.com/learningequality/kolibri/issues/6174
        <KSelect
          v-model="statusSelected"
          :label="coreString('showAction')"
          :options="statusOptions"
          :inline="true"
        />
        -->
        <!-- Remove this div - it makes sure the [NEW LESSON] button stays right-aligned
            while the above <KSelect> is hidden
        -->
        <div>&nbsp;</div>
        <KRouterLink
          :primary="true"
          appearance="raised-button"
          :to="newExamRoute"
          :text="coachString('newQuizAction')"
        />
      </div>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>{{ coachString('titleLabel') }}</th>
            <th>{{ coachString('recipientsLabel') }}</th>
            <th class="center-text">
              {{ coachString('statusLabel') }}
            </th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr
            v-for="exam in filteredExams"
            :key="exam.id"
          >
            <td>
              <KLabeledIcon icon="quiz">
                <KRouterLink
                  :to="$router.getRoute('QuizSummaryPage', { quizId: exam.id })"
                  appearance="basic-link"
                  :text="exam.title"
                />
              </KLabeledIcon>
            </td>

            <td>
              <Recipients
                :groupNames="getRecipientNamesForExam(exam)"
                :hasAssignments="exam.assignments.length > 0"
              />
            </td>

            <td class="center-text button-col core-table-button-col">
              <!-- Open quiz button -->
              <KButton
                v-if="!exam.active && !exam.archive"
                :text="coachString('openQuizLabel')"
                appearance="flat-button"
                @click="showOpenConfirmationModal = true; modalQuizId=exam.id"
              />
              <!-- Close quiz button -->
              <KButton
                v-if="exam.active && !exam.archive"
                :text="coachString('closeQuizLabel')"
                appearance="flat-button"
                @click="showCloseConfirmationModal = true; modalQuizId=exam.id;"
              />
              <!-- Closed quiz label -->
              <div v-if="exam.archive">
                {{ coachString('quizClosedLabel') }}
              </div>
            </td>

          </tr>
        </transition-group>
      </CoreTable>

      <p v-if="!exams.length">
        {{ $tr('noExams') }}
      </p>
      <p
        v-else-if="statusSelected.value === coachString('activeQuizzesLabel') &&
          !activeExams.length"
      >
        {{ $tr('noActiveExams') }}
      </p>
      <p
        v-else-if=" statusSelected.value === coachString('inactiveQuizzesLabel') &&
          !inactiveExams.length"
      >
        {{ $tr('noInactiveExams') }}
      </p>

      <!-- Modals for Close & Open of quiz from right-most column -->
      <KModal
        v-if="showOpenConfirmationModal"
        :title="coachString('openQuizLabel')"
        :submitText="coreString('continueAction')"
        :cancelText="coreString('cancelAction')"
        @cancel="showOpenConfirmationModal = false"
        @submit="handleOpenQuiz(modalQuizId)"
      >
        <div>{{ coachString('openQuizModalDetail') }}</div>
      </KModal>
      <KModal
        v-if="showCloseConfirmationModal"
        :title="coachString('closeQuizLabel')"
        :submitText="coreString('continueAction')"
        :cancelText="coreString('cancelAction')"
        @cancel="showCloseConfirmationModal = false"
        @submit="handleCloseQuiz(modalQuizId)"
      >
        <div>{{ coachString('closeQuizModalDetail') }}</div>
      </KModal>
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ExamResource } from 'kolibri.resources';
  import { PageNames } from '../../../constants';
  import commonCoach from '../../common';
  import PlanHeader from '../../plan/PlanHeader';

  export default {
    name: 'CoachExamsPage',
    metaInfo() {
      return {
        title: this.coreString('quizzesLabel'),
      };
    },
    components: {
      PlanHeader,
      CoreTable,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        statusSelected: {
          label: this.coachString('allQuizzesLabel'),
          value: this.coachString('allQuizzesLabel'),
        },
        showOpenConfirmationModal: false,
        showCloseConfirmationModal: false,
      };
    },
    computed: {
      sortedExams() {
        return this._.orderBy(this.exams, ['date_created'], ['desc']);
      },
      // Hidden temporarily per https://github.com/learningequality/kolibri/issues/6174
      // Uncomment this once we use the filters again.
      /*
      statusOptions() {
        return [
          {
            label: this.coachString('allQuizzesLabel'),
            value: this.coachString('allQuizzesLabel'),
          },
          {
            label: this.coachString('activeQuizzesLabel'),
            value: this.coachString('activeQuizzesLabel'),
          },
          {
            label: this.coachString('inactiveQuizzesLabel'),
            value: this.coachString('inactiveQuizzesLabel'),
          },
        ];
      },
      */
      activeExams() {
        return this.sortedExams.filter(exam => exam.active === true);
      },
      inactiveExams() {
        return this.sortedExams.filter(exam => exam.active === false);
      },
      filteredExams() {
        const filter = this.statusSelected.label;
        if (filter === this.coachString('activeQuizzesLabel')) {
          return this.activeExams;
        } else if (filter === this.coachString('inactiveQuizzesLabel')) {
          return this.inactiveExams;
        }
        return this.sortedExams;
      },
      newExamRoute() {
        return { name: PageNames.EXAM_CREATION_ROOT };
      },
    },
    methods: {
      handleOpenQuiz(quizId) {
        let promise = ExamResource.saveModel({
          id: quizId,
          data: {
            active: true,
            date_activated: new Date(),
          },
          exists: true,
        });

        return promise
          .then(() => {
            this.$store.dispatch('classSummary/refreshClassSummary');
            this.showOpenConfirmationModal = false;
            this.$store.dispatch('createSnackbar', this.coachString('quizOpenedMessage'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.coachString('quizFailedToOpenMessage'));
          });
      },
      handleCloseQuiz(quizId) {
        let promise = ExamResource.saveModel({
          id: quizId,
          data: {
            archive: true,
            date_archived: new Date(),
          },
          exists: true,
        });

        return promise
          .then(() => {
            this.$store.dispatch('classSummary/refreshClassSummary');
            this.showCloseConfirmationModal = false;
            this.$store.dispatch('createSnackbar', this.coachString('quizClosedMessage'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.coachString('quizFailedToCloseMessage'));
          });
      },
    },
    $trs: {
      noExams: 'You do not have any quizzes',
      noActiveExams: 'No active quizzes',
      noInactiveExams: 'No inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped>

  .filter-and-button {
    display: flex;
    flex-wrap: wrap-reverse;
    justify-content: space-between;
    button {
      align-self: flex-end;
    }
  }

  .center-text {
    text-align: center;
  }

  .button-col {
    vertical-align: middle;
  }

</style>
