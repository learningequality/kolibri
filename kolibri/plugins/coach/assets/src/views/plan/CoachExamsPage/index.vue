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
        <KSelect
          v-model="statusSelected"
          :label="$tr('show')"
          :options="statusOptions"
          :inline="true"
        />
        <KRouterLink
          :primary="true"
          appearance="raised-button"
          :to="newExamRoute"
          :text="$tr('newExam')"
        />
      </div>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>{{ $tr('title') }}</th>
            <th>{{ $tr('assignedGroupsHeader') }}</th>
            <th>
              {{ $tr('status') }}
              <CoreInfoIcon
                :iconAriaLabel="$tr('statusDescription')"
                :tooltipText="$tr('statusTooltipText')"
                tooltipPlacement="bottom"
              />
            </th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr
            v-for="exam in filteredExams"
            :key="exam.id"
          >
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" quiz />
                <KRouterLink
                  :to="$router.getRoute('QuizSummaryPage', { quizId: exam.id })"
                  appearance="basic-link"
                  :text="exam.title"
                />
              </KLabeledIcon>
            </td>

            <td> {{ genRecipientsString(exam.groups) }} </td>

            <td>
              <QuizActive :active="exam.active" />
            </td>

          </tr>
        </transition-group>
      </CoreTable>

      <p v-if="!exams.length">
        {{ $tr('noExams') }}
      </p>
      <p v-else-if="statusSelected.value === $tr('activeExams') && !activeExams.length">
        {{ $tr('noActiveExams') }}
      </p>
      <p v-else-if=" statusSelected.value === $tr('inactiveExams') && !inactiveExams.length">
        {{ $tr('noInactiveExams') }}
      </p>
    </KPageContainer>

  </CoreBase>

</template>


<script>

  // import find from 'lodash/find';
  import { mapState, mapActions, mapMutations } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  // import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  // import CatchErrors from 'kolibri.utils.CatchErrors';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import { PageNames } from '../../../constants';
  import commonCoach from '../../common';
  import PlanHeader from '../../plan/PlanHeader';
  import QuizActive from '../../common/QuizActive';

  export default {
    name: 'CoachExamsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      PlanHeader,
      CoreTable,
      KRouterLink,
      KSelect,
      CoreInfoIcon,
      QuizActive,
      KLabeledIcon,
      KIcon,
    },
    mixins: [commonCoach],
    data() {
      return {
        statusSelected: { label: this.$tr('allExams'), value: this.$tr('allExams') },
      };
    },
    computed: {
      ...mapState(['classList']),
      ...mapState('examsRoot', { fullExamInfo: 'exams' }),
      sortedExams() {
        return this.exams.slice().reverse();
      },
      statusOptions() {
        return [
          { label: this.$tr('allExams'), value: this.$tr('allExams') },
          { label: this.$tr('activeExams'), value: this.$tr('activeExams') },
          { label: this.$tr('inactiveExams'), value: this.$tr('inactiveExams') },
        ];
      },
      activeExams() {
        return this.sortedExams.filter(exam => exam.active === true);
      },
      inactiveExams() {
        return this.sortedExams.filter(exam => exam.active === false);
      },
      filteredExams() {
        const filter = this.statusSelected.label;
        if (filter === this.$tr('activeExams')) {
          return this.activeExams;
        } else if (filter === this.$tr('inactiveExams')) {
          return this.inactiveExams;
        }
        return this.sortedExams;
      },
      newExamRoute() {
        return { name: PageNames.EXAM_CREATION_ROOT };
      },
    },
    methods: {
      ...mapActions('examReport', ['updateExamDetails', 'copyExam', 'deleteExam']),
      ...mapMutations('classSummary', ['UPDATE_ITEM', 'CREATE_ITEM', 'DELETE_ITEM']),
      // // format desired by the server, including class
      // serverAssignmentPayload(listOfIDs) {
      //   const assignedToClass = listOfIDs.length === 0 || listOfIDs[0] === this.classId;
      //   if (assignedToClass) {
      //     return [{ collection: this.classId }];
      //   }
      //   return listOfIDs.map(id => {
      //     return { collection: id };
      //   });
      // },
      // // format used client-side, with only groups
      // clientAssigmentState(listOfIDs) {
      //   const assignedToClass = listOfIDs.length === 0 || listOfIDs[0] === this.classId;
      //   if (assignedToClass) {
      //     return [];
      //   }
      //   return listOfIDs;
      // },
      // handleExamDetails(result) {
      //   const listOfIDs = result.assignments.map(item => item.collection);
      //   const serverPayload = {
      //     title: result.title,
      //     active: result.active,
      //     assignments: this.serverAssignmentPayload(listOfIDs),
      //   };
      //   this.updateExamDetails({ examId: this.editExam.id, payload: serverPayload })
      //     .then(() => {
      //       const object = {
      //         id: this.editExam.id,
      //         title: result.title,
      //         groups: this.clientAssigmentState(listOfIDs),
      //         active: result.active,
      //       };
      //       this.UPDATE_ITEM({ map: 'examMap', id: object.id, object });
      //       this.showEditModal = false;
      //     })
      //     .catch(error => {
      //       const errors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
      //       if (errors) {
      //         this.$refs.detailsModal.handleSubmitTitleFailure();
      //       } else {
      //         this.$refs.detailsModal.handleSubmitFailure();
      //       }
      //     });
      // },
      genExamRoute(examId) {
        return {
          name: PageNames.EXAM_PREVIEW,
          params: { examId },
        };
      },
      genRecipientsString(groups) {
        if (!groups.length) {
          return this.$tr('entireClass');
        } else {
          return this.$tr('groups', { count: groups.length });
        }
      },
    },
    $trs: {
      exams: 'Quizzes',
      allExams: 'All quizzes',
      activeExams: 'Active quizzes',
      inactiveExams: 'Inactive quizzes',
      newExam: 'New quiz',
      title: 'Title',
      assignedGroupsHeader: 'Visible to',
      noExams: 'You do not have any quizzes',
      noActiveExams: 'No active quizzes',
      noInactiveExams: 'No inactive quizzes',
      show: 'Show',
      status: 'Status',
      statusDescription: 'Status description',
      statusTooltipText: 'Learners can only see active quizzes',
      entireClass: 'Entire class',
      groups: '{count, number, integer} {count, plural, one {Group} other {Groups}}',
      nobody: 'Nobody',
      documentTitle: 'Quizzes',
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

</style>
