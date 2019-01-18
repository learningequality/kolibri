<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('classesLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <PlanHeader />

      <h1>{{ $tr('exams') }}</h1>
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
            <th class="core-table-icon-col"></th>
            <th class="core-table-main-col">{{ $tr('title') }}</th>
            <th>{{ $tr('assignedGroupsHeader') }}</th>
            <th>
              {{ $tr('status') }}
              <CoreInfoIcon
                :iconAriaLabel="$tr('statusDescription')"
                :tooltipText="$tr('statusTooltipText')"
                tooltipPlacement="bottom"
              />
            </th>
            <th><span class="visuallyhidden">{{ examReportPageStrings.$tr('options') }}</span></th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr
            v-for="exam in filteredExams"
            :key="exam.id"
          >
            <td class="core-table-icon-col">
              <ContentIcon :kind="examKind" />
            </td>

            <td class="core-table-main-col">
              {{ exam.title }}
            </td>

            <td> {{ genRecipientsString(exam.groups) }} </td>

            <td>
              <StatusIcon :active="exam.active" :type="examKind" />
            </td>

            <td class="options">
              <KDropdownMenu
                slot="optionsDropdown"
                :text="examReportPageStrings.$tr('options')"
                :options="actionOptions"
                appearance="flat-button"
                @select="showModal(exam)"
              />
            </td>
          </tr>
        </tbody>
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
    </div>

    <AssignmentDetailsModal
      v-if="showEditModal"
      ref="detailsModal"
      :modalTitle="manageExamModalStrings.$tr('editExamDetails')"
      :submitErrorMessage="manageExamModalStrings.$tr('saveExamError')"
      :showDescriptionField="false"
      :isInEditMode="true"
      :initialTitle="editExam.title"
      :initialSelectedCollectionIds="editExam.groups"
      :classId="classId"
      :groups="groups"
      :showActiveOption="true"
      :initialActive="editExam.active"
      :modalActiveOption="manageExamModalStrings.$tr('changeExamStatusActive')"
      :modalInactiveOption="manageExamModalStrings.$tr('changeExamStatusInactive')"
      @save="handleExamDetails"
      @cancel="showEditModal = false"
    />

  </CoreBase>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { ContentNodeKinds, CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import StatusIcon from '../../assignments/StatusIcon';
  import { PageNames } from '../../../constants';
  import imports from '../../new/imports';
  import PlanHeader from '../../new/PlanHeader';
  import ManageExamModals from '../ExamReportPage/ManageExamModals';
  import ExamReportPage from '../ExamReportPage';
  import AssignmentDetailsModal from '../../assignments/AssignmentDetailsModal';
  import { AssignmentActions } from '../../../constants/assignmentsConstants';

  const examReportPageStrings = crossComponentTranslator(ExamReportPage);
  const manageExamModalStrings = crossComponentTranslator(ManageExamModals);

  export default {
    name: 'CoachExamsPage',
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
      ContentIcon,
      StatusIcon,
      AssignmentDetailsModal,
    },
    mixins: [imports],
    data() {
      return {
        statusSelected: { label: this.$tr('allExams'), value: this.$tr('allExams') },
        showEditModal: false,
        editExam: {},
      };
    },
    computed: {
      ...mapState(['classId']),
      ...mapState('classSummary', ['exams', 'groups']),
      ...mapGetters('classSummary', ['examsMap', 'groupMap']),
      examReportPageStrings() {
        return examReportPageStrings;
      },
      manageExamModalStrings() {
        return manageExamModalStrings;
      },
      examKind() {
        return ContentNodeKinds.EXAM;
      },
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
      actionOptions() {
        return [
          {
            label: this.examReportPageStrings.$tr('editDetails'),
            value: AssignmentActions.EDIT_DETAILS,
          },
          {
            label: this.examReportPageStrings.$tr('copyExamOptionLabel'),
            value: AssignmentActions.COPY,
          },
          { label: this.examReportPageStrings.$tr('delete'), value: AssignmentActions.DELETE },
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
      ...mapActions('examReport', ['updateExamDetails']),
      showModal(exam) {
        this.editExam = exam;
        this.showEditModal = true;
      },
      handleExamDetails(details) {
        this.updateExamDetails({ examId: this.editExam.id, payload: details });
        this.showEditModal = false;
      },
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

  .options {
    text-align: right;
  }

</style>
