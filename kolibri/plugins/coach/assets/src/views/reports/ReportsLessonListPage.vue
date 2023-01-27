<template>

  <CoachAppBarPage
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <KPageContainer>
      <ReportsHeader :title="$isPrint ? $tr('printLabel', { className }) : null" />
      <ReportsControls @export="exportCSV">
        <KSelect
          v-model="filter"
          :label="coachString('filterLessonStatus')"
          :options="filterOptions"
          :inline="true"
        />

      </ReportsControls>
      <p>
        {{ $tr('availablSizeTolearner') }}
      </p>

      <CoreTable :emptyMessage="emptyMessage">
        <template #headers>
          <th>{{ coachString('titleLabel') }}</th>
          <th>{{ coreString('progressLabel') }}</th>
          <th>{{ coachString('recipientsLabel') }}</th>
          <th>{{ coreString('sizeLabelText') }}</th>
          <th v-show="!$isPrint">
            {{ coachString('lessonVisibleLabel') }}
          </th>
        </template>
        <template #tbody>
          <transition-group
            tag="tbody"
            name="list"
          >
            <tr
              v-for="tableRow in table"
              :key="tableRow.id"
            >
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
              <!-- Waiting for the backend implementation -->
              <td>
                2MB
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
  </CoachAppBarPage>

</template>


<script>

  import { LessonResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsControls from './ReportsControls';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsLessonListPage',
    components: {
      CoachAppBarPage,
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
        if (this.filter.value === 'visibleLessons') {
          return this.$tr('noVisibleLessons');
        }
        if (this.filter.value === 'lessonsNotVisible') {
          return this.$tr('noLessonsNotVisble');
        }

        return '';
      },
      filterOptions() {
        return [
          {
            label: this.coachString('filterLessonAll'),
            value: 'allLessons',
          },
          {
            label: this.coachString('filterLessonVisible'),
            value: 'visibleLessons',
          },
          {
            label: this.coachString('filterLessonNotVisible'),
            value: 'lessonsNotVisible',
          },
        ];
      },
      table() {
        const filtered = this.lessons.filter(lesson => {
          if (this.filter.value === 'allLessons') {
            return true;
          } else if (this.filter.value === 'visibleLessons') {
            return lesson.active;
          } else if (this.filter.value === 'lessonsNotVisible') {
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
      visibleLessons: 'Visile lessons',
      lessonsNotVisible: 'Lessons not visible',
      noVisibleLessons: 'No visible lessons',
      noLessonsNotVisble: 'No lessons not visible',
      printLabel: {
        message: '{className} Lessons',
        context:
          "Title that displays on a printed copy of the 'Reports' > 'Lessons' page. This shows if the user uses the 'Print' option by clicking on the printer icon.",
      },
      availablSizeTolearner: {
        message: 'Total size of lessons that are visible to learners: 162 MB',
        context: 'The text for notifying about the availbale size for learners',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/list-transition';
  @import '../common/print-table';

</style>
