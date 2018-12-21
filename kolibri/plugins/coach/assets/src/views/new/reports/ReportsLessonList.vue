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
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsLesson' }}"
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
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsLesson' }}"
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

  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import LessonActive from '../LessonActive';
  import Recipients from '../Recipients';
  import Completed from '../Status/Completed';
  import NeedHelp from '../Status/NeedHelp';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsLessonList',
    components: {
      LessonActive,
      Recipients,
      Completed,
      NeedHelp,
      ReportsHeader,
      KSelect,
      KRouterLink,
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
