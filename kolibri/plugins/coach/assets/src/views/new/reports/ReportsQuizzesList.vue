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
          <td>{{ $tr('tableHeaderCompleted') }}</td>
          <td>{{ $tr('tableHeaderRecipients') }}</td>
          <td>{{ $tr('tableHeaderStatus') }}</td>
        </tr>
      </thead>
      <tbody>
        <td></td>
        <td></td>
        <td></td>
        <td>
          <LessonActive :active="true" />
        </td>
      </tbody>
    </table>
  </div>

</template>


<script>

  import KSelect from 'kolibri.coreVue.components.KSelect';
  import LessonActive from '../LessonActive';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsLessonList',
    components: {
      LessonActive,
      ReportsHeader,
      KSelect,
    },
    data() {
      return {
        filter: 'allLessons',
      };
    },
    computed: {
      filterOptions() {
        return [
          {
            label: this.$tr('allLessons'),
            value: 'allLessons',
          },
          {
            label: this.$tr('activeLessons'),
            value: 'activeLessons',
          },
          {
            label: this.$tr('inactiveLessons'),
            value: 'inactiveLessons',
          },
        ];
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    $trs: {
      show: 'Show',
      allLessons: 'All lessons',
      activeLessons: 'Active lessons',
      inactiveLessons: 'Inactive lessons',
      tableHeaderTitle: 'Title',
      tableHeaderCompleted: 'Completed',
      tableHeaderRecipients: 'Recipients',
      tableHeaderStatus: 'Status',
    },
  };

</script>


<style lang="scss" scoped></style>
