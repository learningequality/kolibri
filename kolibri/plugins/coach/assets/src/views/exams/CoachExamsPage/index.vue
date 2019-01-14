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
              <KRouterLink
                :text="exam.title"
                :to="genExamRoute(exam.id)"
              />
            </td>

            <td> {{ genRecipientsString(exam.assignments) }} </td>

            <td>
              <StatusIcon :active="exam.active" :type="examKind" />
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
  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { ContentNodeKinds, CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import StatusIcon from '../../assignments/StatusIcon';
  import { PageNames } from '../../../constants';
  import imports from '../../new/imports';
  import PlanHeader from '../../new/PlanHeader';

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
    },
    mixins: [imports],
    data() {
      return {
        statusSelected: { label: this.$tr('allExams'), value: this.$tr('allExams') },
      };
    },
    computed: {
      ...mapState('examsRoot', ['exams']),
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
      genExamRoute(examId) {
        return {
          name: PageNames.EXAM_REPORT,
          params: { examId },
        };
      },
      genRecipientsString(assignments) {
        if (!assignments.length) {
          return this.$tr('nobody');
        } else if (assignments[0].collection_kind === CollectionKinds.CLASSROOM) {
          return this.$tr('entireClass');
        } else if (assignments[0].collection_kind === CollectionKinds.LEARNERGROUP) {
          return this.$tr('groups', { count: assignments.length });
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

</style>
