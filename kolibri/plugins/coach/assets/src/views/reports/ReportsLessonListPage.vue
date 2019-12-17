<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <ReportsHeader :title="$isPrint ? $tr('printLabel', {className}) : null" />
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
        <thead slot="thead">
          <tr>
            <th>{{ coachString('titleLabel') }}</th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ coachString('recipientsLabel') }}</th>
            <th v-show="!$isPrint">
              {{ $tr('visibleToLearnersLabel') }}
            </th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon icon="lesson">
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
                :groupNames="getRecipientNamesForExam(tableRow)"
                :hasAssignments="tableRow.assignments.length > 0"
              />
            </td>
            <td v-show="!$isPrint">
              <KSwitch
                name="toggle-lesson-visibility"
                :checked="tableRow.active"
                :value="tableRow.active"
                @change="handleToggleVisibility(tableRow)"
              />
            </td>
          </tr>
        </transition-group>
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
        if (this.filter.value === 'activeLessons') {
          return this.$tr('noActiveLessons');
        }
        if (this.filter.value === 'inactiveLessons') {
          return this.$tr('noInactiveLessons');
        }

        return '';
      },
      filterOptions() {
        return [
          {
            label: this.coreString('allLessonsLabel'),
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
        const sorted = this._.orderBy(filtered, ['date_created'], ['desc']);
        return sorted.map(lesson => {
          const learners = this.getLearnersForLesson(lesson);
          const tableRow = {
            totalLearners: learners.length,
            tally: this.getLessonStatusTally(lesson.id, learners),
            groupNames: this.getGroupNames(lesson.groups),
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
        const columns = [...csvFields.title(), ...csvFields.recipients(), ...csvFields.tally()];

        const fileName = this.$tr('printLabel', { className: this.className });
        new CSVExporter(columns, fileName).export(this.table);
      },
    },
    $trs: {
      activeLessons: 'Active lessons',
      inactiveLessons: 'Inactive lessons',
      noActiveLessons: 'No active lessons',
      noInactiveLessons: 'No inactive lessons',
      visibleToLearnersLabel: {
        message: 'Visible to learners',
        context:
          'Column header for table of lessons which will include a toggle switch the user can use to set the visibility status of a lesson.',
      },
      printLabel: '{className} Lessons',
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/list-transition';
  @import '../common/print-table';

</style>
