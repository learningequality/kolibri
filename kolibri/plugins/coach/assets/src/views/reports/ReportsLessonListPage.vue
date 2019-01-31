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
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('titleLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
            <td>{{ coachStrings.$tr('recipientsLabel') }}</td>
            <td>{{ coachStrings.$tr('statusLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KRouterLink
                :text="tableRow.title"
                :to="classRoute('ReportsLessonReportPage', { lessonId: tableRow.id })"
              />
            </td>
            <td>
              <StatusSummary
                :tallyObject="tableRow.tallyObject"
                :verbose="true"
              />
            </td>
            <td>
              <Recipients
                :groups="tableRow.groupNames"
              />
            </td>
            <td><LessonActive :active="tableRow.active" /></td>
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
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
      ...mapGetters('classSummary', [
        'lessons',
        'getGroupNames',
        'getLearnersForGroups',
        'getLessonStatusCounts',
      ]),
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
        const filtered = this.lessons.filter(lesson => {
          if (this.filter.value === 'allLessons') {
            return true;
          } else if (this.filter.value === 'activeLessons') {
            return lesson.active;
          } else if (this.filter.value === 'inactiveLessons') {
            return !lesson.active;
          }
        });
        const sorted = this._.sortBy(filtered, ['title', 'active']);
        const mapped = sorted.map(lesson => {
          const learners = this.getLearnersForGroups(lesson.groups);
          const tableRow = {
            totalLearners: learners.length,
            tallyObject: this.getLessonStatusCounts(lesson.id, learners),
            groupNames: this.getGroupNames(lesson.groups),
          };
          Object.assign(tableRow, lesson);
          return tableRow;
        });
        return mapped;
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
