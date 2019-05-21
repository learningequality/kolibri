<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <ReportsHeader />
      <KSelect
        v-model="filter"
        :label="$tr('show')"
        :options="filterOptions"
        :inline="true"
      />
      <CoreTable :emptyMessage="emptyMessage">
        <thead slot="thead">
          <tr>
            <th>{{ coachStrings.$tr('titleLabel') }}</th>
            <th>{{ coachStrings.$tr('progressLabel') }}</th>
            <th>{{ coachStrings.$tr('recipientsLabel') }}</th>
            <th>{{ coachStrings.$tr('statusLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" lesson />
                <KRouterLink
                  :text="tableRow.title"
                  :to="classRoute('ReportsLessonReportPage', { lessonId: tableRow.id })"
                />
              </KLabeledIcon>
            </td>
            <td>
              <StatusSummary
                :tally="tableRow.tally"
                :verbose="true"
              />
            </td>
            <td>
              <Recipients
                :groupNames="tableRow.groupNames"
                :hasAssignments="tableRow.hasAssignments"
              />
            </td>
            <td><LessonActive :active="tableRow.active" /></td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import commonCoach from '../common';
  import LessonsRootPage from '../plan/LessonsRootPage';
  import ReportsHeader from './ReportsHeader';

  const LessonsRootPageStrings = crossComponentTranslator(LessonsRootPage);

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
      emptyMessage() {
        if (this.filter.value === 'allLessons') {
          return this.coachStrings.$tr('lessonListEmptyState');
        }
        if (this.filter.value === 'activeLessons') {
          return LessonsRootPageStrings.$tr('noActiveLessons');
        }
        if (this.filter.value === 'inactiveLessons') {
          return LessonsRootPageStrings.$tr('noInactiveLessons');
        }

        return '';
      },
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
            tally: this.getLessonStatusTally(lesson.id, learners),
            groupNames: this.getGroupNames(lesson.groups),
            hasAssignments: lesson.assignments.length > 0,
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
