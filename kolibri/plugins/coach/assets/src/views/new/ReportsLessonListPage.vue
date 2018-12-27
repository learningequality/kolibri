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
          <td>{{ coachStrings.$tr('titleLabel') }}</td>
          <td>{{ coachStrings.$tr('progressLabel') }}</td>
          <td>{{ coachStrings.$tr('recipientsLabel') }}</td>
          <td>{{ coachStrings.$tr('statusLabel') }}</td>
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
          <td>
            <LearnerProgressRatio
              :count="1"
              :total="100"
              verbosity="0"
              verb="completed"
              icon="learners"
            />
          </td>
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
          <td>
            <LearnerProgressRatio
              :count="3"
              :total="10"
              verbosity="0"
              verb="completed"
              icon="learners"
            />
          </td>
          <td>
            <Recipients :groups="['group A', 'group B']" />
            <LearnerProgressCount
              verb="needHelp"
              icon="help"
              :count="3"
              :verbosity="0"
            />
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
    },
  };

</script>


<style lang="scss" scoped></style>
