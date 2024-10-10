<template>

  <CoachAppBarPage>
    <KPageContainer>
      <ReportsHeader
        :activeTabId="ReportsTabs.LESSONS"
        :title="$isPrint ? $tr('printLabel', { className }) : null"
      />
      <p
        v-if="calcTotalSizeOfVisibleLessons !== null"
        class="total-size"
      >
        {{ coachString('totalLessonsSize', { size: calcTotalSizeOfVisibleLessons }) }}
      </p>

      <KTabsPanel
        :tabsId="REPORTS_TABS_ID"
        :activeTabId="ReportsTabs.LESSONS"
      >
        <ReportsControls @export="exportCSV">
          <KSelect
            v-model="filter"
            :label="coachString('filterLessonStatus')"
            :options="filterOptions"
            :inline="true"
          />
        </ReportsControls>
        <CoreTable :emptyMessage="emptyMessage">
          <template #headers>
            <th>{{ coachString('titleLabel') }}</th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ coachString('recipientsLabel') }}</th>
            <th>{{ coachString('sizeLabel') }}</th>
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
                    :groupNames="tableRow.recipientNames"
                    :hasAssignments="tableRow.assignments.length > 0"
                  />
                </td>
                <td>
                  <template v-if="typeof tableRow.size !== 'undefined'">
                    {{ bytesForHumans(tableRow.size) }}
                  </template>
                  <KEmptyPlaceholder v-else />
                </td>
                <td v-show="!$isPrint">
                  <KSwitch
                    name="toggle-lesson-visibility"
                    label=""
                    :checked="tableRow.active"
                    :value="tableRow.active"
                    @change="toggleModal(tableRow)"
                  />
                </td>
              </tr>
            </transition-group>
          </template>
        </CoreTable>
        <KModal
          v-if="showLessonIsVisibleModal && !userHasDismissedModal"
          :title="coachString('makeLessonVisibleTitle')"
          :submitText="coreString('continueAction')"
          :cancelText="coreString('cancelAction')"
          @submit="handleToggleVisibility(activeLesson)"
          @cancel="showLessonIsVisibleModal = false"
        >
          <p>{{ coachString('makeLessonVisibleText') }}</p>
          <p>
            {{ coachString('fileSizeToDownload', { size: bytesForHumans(activeLesson.size) }) }}
          </p>
          <KCheckbox
            :checked="dontShowAgainChecked"
            :label="coachString('dontShowAgain')"
            @change="dontShowAgainChecked = $event"
          />
        </KModal>

        <KModal
          v-if="showLessonIsNotVisibleModal && !userHasDismissedModal"
          :title="coachString('makeLessonNotVisibleTitle')"
          :submitText="coreString('continueAction')"
          :cancelText="coreString('cancelAction')"
          @submit="handleToggleVisibility(activeLesson)"
          @cancel="showLessonIsNotVisibleModal = false"
        >
          <p>{{ coachString('makeLessonNotVisibleText') }}</p>
          <p>{{ coachString('fileSizeToRemove', { size: bytesForHumans(activeLesson.size) }) }}</p>
          <KCheckbox
            :checked="dontShowAgainChecked"
            :label="coachString('dontShowAgain')"
            @change="dontShowAgainChecked = $event"
          />
        </KModal>
      </KTabsPanel>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { LessonResource } from 'kolibri.resources';
  import { mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { LESSON_VISIBILITY_MODAL_DISMISSED } from 'kolibri.coreVue.vuex.constants';
  import Lockr from 'lockr';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import useSnackbar from 'kolibri.coreVue.composables.useSnackbar';
  import commonCoach from '../common';
  import { REPORTS_TABS_ID, ReportsTabs } from '../../constants/tabsConstants';
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
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar };
    },
    data() {
      return {
        REPORTS_TABS_ID,
        ReportsTabs,
        filter: 'allLessons',
        showLessonIsVisibleModal: false,
        showLessonIsNotVisibleModal: false,
        activeLesson: null,
        dontShowAgainChecked: false,
        learnOnlyDevicesExist: false,
      };
    },
    computed: {
      emptyMessage() {
        if (this.filter.value === 'allLessons') {
          return this.coachString('lessonListEmptyState');
        }
        if (this.filter.value === 'visibleLessons') {
          return this.coreString('noResultsLabel');
        }
        if (this.filter.value === 'lessonsNotVisible') {
          return this.coreString('noResultsLabel');
        }
        return '';
      },
      userHasDismissedModal() {
        return Lockr.get(LESSON_VISIBILITY_MODAL_DISMISSED);
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
            groupNames: this.getGroupNames(lesson.assignments),
            recipientNames: this.getRecipientNamesForLesson(lesson),
            hasAssignments: learners.length > 0,
          };
          Object.assign(tableRow, lesson);
          return tableRow;
        });
      },
      calcTotalSizeOfVisibleLessons() {
        if (this.table && this.table.length) {
          const sum = this.table
            .filter(
              // only include visible lessons
              lesson => lesson.active,
            )
            .reduce((acc, lesson) => {
              return acc + (lesson.size || 0);
            }, 0);
          return bytesForHumans(sum);
        }
        return null;
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    mounted() {
      this.checkIfAnyLODsInClass();
    },
    methods: {
      ...mapActions(['fetchUserSyncStatus']),
      handleToggleVisibility(lesson) {
        const newActiveState = !lesson.active;
        const snackbarMessage = newActiveState
          ? this.coachString('lessonVisibleToLearnersLabel')
          : this.coachString('lessonNotVisibleToLearnersLabel');
        const promise = LessonResource.saveModel({
          id: lesson.id,
          data: {
            active: newActiveState,
          },
          exists: true,
        });
        this.manageModalVisibilityAndPreferences();
        return promise.then(() => {
          this.$store.dispatch('classSummary/refreshClassSummary');
          this.createSnackbar(snackbarMessage);
        });
      },
      exportCSV() {
        const columns = [
          ...csvFields.title(),
          ...csvFields.recipients(this.className),
          ...csvFields.tally(),
          ...csvFields.allLearners('totalLearners'),
        ];
        const fileName = this.$tr('printLabel', { className: this.className });
        new CSVExporter(columns, fileName).export(this.table);
      },
      // modal about lesson sizes should only exist of LODs exist in the class
      // which we are checking via if there have recently been any user syncs
      // TODO: refactor to a more robust check
      checkIfAnyLODsInClass() {
        this.fetchUserSyncStatus({ member_of: this.$route.params.classId }).then(data => {
          if (data && data.length > 0) {
            this.learnOnlyDevicesExist = true;
          }
        });
      },
      toggleModal(lesson) {
        // has the user set their preferences to not have a modal confirmation?
        const hideModalConfirmation = Lockr.get(LESSON_VISIBILITY_MODAL_DISMISSED);
        this.activeLesson = lesson;
        if (!hideModalConfirmation && this.learnOnlyDevicesExist) {
          if (lesson.active) {
            this.showLessonIsVisibleModal = false;
            this.showLessonIsNotVisibleModal = true;
          } else {
            this.showLessonIsNotVisibleModal = false;
            this.showLessonIsVisibleModal = true;
          }
        } else {
          // proceed with visibility changes withhout the modal
          this.handleToggleVisibility(lesson);
        }
      },
      manageModalVisibilityAndPreferences() {
        if (this.dontShowAgainChecked) {
          Lockr.set(LESSON_VISIBILITY_MODAL_DISMISSED, true);
        }
        this.activeLesson = null;
        this.showLessonIsVisibleModal = false;
        this.showLessonIsNotVisibleModal = false;
      },
      bytesForHumans,
    },
    $trs: {
      visibleLessons: 'Visible lessons',
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

  .total-size {
    padding: 16px 0;
  }

</style>
