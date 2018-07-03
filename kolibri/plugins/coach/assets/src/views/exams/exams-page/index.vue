<template>

  <div>
    <h1>{{ $tr('exams') }}</h1>
    <div class="filter-and-button">
      <k-select
        :label="$tr('show')"
        :options="statusOptions"
        :inline="true"
        v-model="statusSelected"
      />
      <k-router-link
        :primary="true"
        appearance="raised-button"
        :to="newExamRoute"
        :text="$tr('newExam')"
      />
    </div>
    <core-table>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th class="core-table-main-col">{{ $tr('title') }}</th>
          <th>{{ $tr('recipients') }}</th>
          <th>
            {{ $tr('status') }}
            <core-info-icon
              :iconAriaLabel="$tr('statusDescription')"
              :tooltipText="$tr('statusTooltipText')"
              tooltipPosition="bottom right"
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
            <content-icon :kind="examIcon" />
          </td>

          <td class="core-table-main-col">
            <k-router-link
              :text="exam.title"
              :to="genExamRoute(exam.id)"
            />
          </td>

          <td> {{ genRecipientsString(exam.assignments) }} </td>

          <td>
            <status-icon :active="exam.active" />
          </td>
        </tr>
      </tbody>
    </core-table>

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

</template>


<script>

  import coreTable from 'kolibri.coreVue.components.coreTable';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import { ContentNodeKinds, CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import StatusIcon from '../../assignments/StatusIcon';
  import { PageNames } from '../../../constants';

  export default {
    name: 'coachExamsPage',
    $trs: {
      exams: 'Exams',
      allExams: 'All exams',
      activeExams: 'Active exams',
      inactiveExams: 'Inactive exams',
      newExam: 'New exam',
      title: 'Title',
      recipients: 'Recipients',
      noExams: 'You do not have any exams',
      noActiveExams: 'No active exams',
      noInactiveExams: 'No inactive exams',
      show: 'Show',
      status: 'Status',
      statusDescription: 'Status description',
      statusTooltipText: 'Learners can only see active lessons',
      entireClass: 'Entire class',
      groups: '{count, number, integer} {count, plural, one {Group} other {Groups}}',
      nobody: 'Nobody',
    },
    components: {
      coreTable,
      kRouterLink,
      kSelect,
      CoreInfoIcon,
      contentIcon,
      StatusIcon,
    },
    data() {
      return {
        statusSelected: { label: this.$tr('allExams'), value: this.$tr('allExams') },
      };
    },
    computed: {
      examIcon() {
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
        return { name: PageNames.CREATE_EXAM };
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
    vuex: {
      getters: {
        exams: state => state.pageState.exams,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .filter-and-button
    display: flex
    flex-wrap: wrap-reverse
    justify-content: space-between
    button
      align-self: flex-end

  .center-text
    text-align: center

</style>
