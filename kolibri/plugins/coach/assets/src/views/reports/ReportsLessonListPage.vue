<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <template #sub-nav>
      <TopNavbar />
    </template>

    <KPageContainer>
      <ReportsHeader :title="$isPrint ? $tr('printLabel', { className }) : null" />
      <ReportsControls @export="exportCSV">
        <!-- Hidden temporarily per https://github.com/learningequality/kolibri/issues/6174
        <KSelect
          v-model="filter"
          :label="coreString('showAction')"
          :options="filterOptions"
          :inline="true"
        />
        -->
      </ReportsControls>
      <CoreTable :emptyMessage="emptyMessage">
        <template #headers>
          <th>{{ coachString('titleLabel') }}</th>
          <th>{{ coreString('progressLabel') }}</th>
          <th>{{ coachString('recipientsLabel') }}</th>
          <th v-show="!$isPrint">
            {{ coachString('lessonVisibleLabel') }}
          </th>
        </template>
        <template #tbody>
          <transition-group tag="tbody" name="list">
            <tr v-for="tableRow in table" :key="tableRow.id">
              <td>
                <KRouterLink
                  :text="tableRow.title"
                  :to="classRoute('ReportsLessonReportPage', { lessonId: tableRow.id })"
                  icon="lesson"
                />
              </td>
              <td>
                <StatusSummary
                  :tally="tableRow.tally"
                  :verbose="true"
                />
              </td>
              <td>
                <Recipients
                  :groupNames="getRecipientNamesForExam(tableRow)"
                  :hasAssignments="tableRow.assignments.length > 0"
                />
              </td>
              <td v-show="!$isPrint">
                <KSwitch
                  name="toggle-lesson-visibility"
                  label=""
                  :checked="tableRow.active"
                  :value="tableRow.active"
                  @change="handleToggleVisibility(tableRow)"
                />
              </td>
            </tr>
          </transition-group>
        </template>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { LessonResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsControls from './ReportsControls';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsLessonListPage',
    components: {
      ReportsControls,
      ReportsHeader,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        filter: 'allLessons',
      };
    },
    computed: {
      emptyMessage() {
        if (this.filter.value === 'allLessons') {
          return this.coachString('lessonListEmptyState');
        }
        // if (this.filter.value === 'activeLessons') {
        //   return this.$tr('noActiveLessons');
        // }
        // if (this.filter.value === 'inactiveLessons') {
        //   return this.$tr('noInactiveLessons');
        // }

        return '';
      },
      filterOptions() {
        return [
          {
            label: this.coreString('allLessonsLabel'),
            value: 'allLessons',
          },
          // {
          //   label: this.$tr('activeLessons'),
          //   value: 'activeLessons',
          // },
          // {
          //   label: this.$tr('inactiveLessons'),
          //   value: 'inactiveLessons',
          // },
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
        const sorted = this._.orderBy(filtered, ['date_created'], ['desc']);
        return sorted.map(lesson => {
          const learners = this.getLearnersForLesson(lesson);
          const tableRow = {
            totalLearners: learners.length,
            tally: this.getLessonStatusTally(lesson.id, learners),
            groupNames: this.getGroupNames(lesson.groups),
            recipientNames: this.getRecipientNamesForExam(lesson),
            hasAssignments: learners.length > 0,
          };
          Object.assign(tableRow, lesson);
          return tableRow;
        });
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    methods: {
      handleToggleVisibility(lesson) {
        const newActiveState = !lesson.active;
        const snackbarMessage = newActiveState
          ? this.coachString('lessonVisibleToLearnersLabel')
          : this.coachString('lessonNotVisibleToLearnersLabel');

        let promise = LessonResource.saveModel({
          id: lesson.id,
          data: {
            is_active: newActiveState,
          },
          exists: true,
        });

        return promise.then(() => {
          this.$store.dispatch('classSummary/refreshClassSummary');
          this.$store.dispatch('createSnackbar', snackbarMessage);
        });
      },
      exportCSV() {
        const columns = [
          ...csvFields.title(),
          ...csvFields.recipients(this.className),
          ...csvFields.tally(),
        ];

        const fileName = this.$tr('printLabel', { className: this.className });
        new CSVExporter(columns, fileName).export(this.table);
      },
    },
    $trs: {
      // activeLessons: 'Active lessons',
      // inactiveLessons: 'Inactive lessons',
      // noActiveLessons: 'No active lessons',
      // noInactiveLessons: 'No inactive lessons',
      printLabel: {
        message: '{className} Lessons',
        context:
          "Title that displays on a printed copy of the 'Reports' > 'Lessons' page. This shows if the user uses the 'Print' option by clicking on the printer icon.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/list-transition';
  @import '../common/print-table';

</style>
