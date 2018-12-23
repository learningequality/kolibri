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
        <tr>
          <td>
            <KRouterLink
              text="Lesson A"
              :to="newCoachRoute('ReportsLessonPage')"
            />
          </td>
          <td><Completed :count="1" :total="100" /></td>
          <td><Recipients :groups="[]" /></td>
          <td><LessonActive :active="true" /></td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="Lesson B"
              :to="newCoachRoute('ReportsLessonPage')"
            />
          </td>
          <td><Completed :count="3" :total="10" /></td>
          <td>
            <Recipients :groups="[1, 2]" /> &nbsp; <NeedHelp :count="3" />
          </td>
          <td><LessonActive :active="false" /></td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsLessonListPage',
    components: {
      ReportsHeader,
    },
    mixins: [imports],
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
