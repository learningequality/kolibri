<template>

  <div class="new-coach-block">
    <ReportsHeader />
    <KSelect
      v-model="filter"
      :label="$tr('show')"
      :options="filterOptions"
      :inline="true"
    />
    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ $tr('tableHeaderTitle') }}</td>
          <td>{{ $tr('tableHeaderAverageScore') }}</td>
          <td>{{ $tr('tableHeaderCompleted') }}</td>
          <td>{{ $tr('tableHeaderRecipients') }}</td>
          <td>{{ $tr('tableHeaderStatus') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <KRouterLink
              text="Another quiz"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsQuizPage' }}"
            />
          </td>
          <td>-</td>
          <td><NotStarted :count="0" :total="10" /></td>
          <td><Recipients :groups="['a', 'b']" /></td>
          <td>
            <QuizActive :active="false" />
          </td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="Quiz A"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsQuizPage' }}"
            />
          </td>
          <td>-</td>
          <td><InProgress :count="8" :total="10" /></td>
          <td><Recipients :groups="['a', 'b']" /></td>
          <td>
            <QuizActive :active="true" />
          </td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="Quiz B"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsQuizPage' }}"
            />
          </td>
          <td>{{ $tr('score', {score: 0.9}) }}</td>
          <td><Completed :count="10" :total="10" /></td>
          <td><Recipients :groups="[]" /></td>
          <td>
            <QuizActive :active="true" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import QuizActive from './shared/QuizActive';
  import ReportsHeader from './ReportsHeader';
  import Recipients from './shared/Recipients';
  import Completed from './shared/status/Completed';
  import InProgress from './shared/status/InProgress';
  import NotStarted from './shared/status/NotStarted';

  export default {
    name: 'ReportsQuizListPage',
    components: {
      QuizActive,
      ReportsHeader,
      KSelect,
      KRouterLink,
      NotStarted,
      InProgress,
      Completed,
      Recipients,
    },
    data() {
      return {
        filter: 'allQuizzes',
      };
    },
    computed: {
      filterOptions() {
        return [
          {
            label: this.$tr('allQuizzes'),
            value: 'allQuizzes',
          },
          {
            label: this.$tr('activeQuizzes'),
            value: 'activeQuizzes',
          },
          {
            label: this.$tr('inactiveQuizzes'),
            value: 'inactiveQuizzes',
          },
        ];
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    $trs: {
      show: 'Show',
      score: '{score, number, percent}',
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
      tableHeaderTitle: 'Title',
      tableHeaderAverageScore: 'Average score',
      tableHeaderCompleted: 'Completed',
      tableHeaderRecipients: 'Recipients',
      tableHeaderStatus: 'Status',
    },
  };

</script>


<style lang="scss" scoped></style>
