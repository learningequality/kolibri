<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

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
        <transition-group is="tbody" name="list">
          <tr v-for="lesson in table" :key="lesson.id">
            <td>
              <KRouterLink
                :text="lesson.title"
                :to="classRoute('ReportsLessonReportPage', { lessonId: lesson.id })"
              />
            </td>
            <td>
              <LearnerProgressRatio
                :count="1"
                :total="data.numLearnersAssigned(lesson.groups)"
                verbosity="0"
                verb="completed"
                icon="learners"
              />
            </td>
            <td>
              <Recipients
                :groups="data.groupNames(lesson.groups)"
              />
            </td>
            <td><LessonActive :active="lesson.active" /></td>
          </tr>
        </transition-group>
      </table>
    </div>
  </CoreBase>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import commonCoach from '../common';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsLessonListPage',
    components: {
      ReportsHeader,
    },
    mixins: [commonCoach],
    data() {
      return {
        filter: 'allLessons',
      };
    },
    computed: {
      ...mapState('classSummary', []),
      ...mapGetters('classSummary', ['lessons']),
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
      table() {
        return this.lessons.filter(lesson => {
          // console.log(lesson.active);
          if (this.filter.value === 'allLessons') {
            return true;
          } else if (this.filter.value === 'activeLessons') {
            return lesson.active;
          } else if (this.filter.value === 'inactiveLessons') {
            return !lesson.active;
          }
        });
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


<style lang="scss" scoped>

  @import '../common/list-transition';

</style>
