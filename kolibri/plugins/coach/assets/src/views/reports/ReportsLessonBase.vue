<template>

  <CoachAppBarPage>
    <KGrid gutter="16">
      <KGridItem>
        <QuizLessonDetailsHeader
          examOrLesson="lesson"
          :backlinkLabel="group ? group.name : coreString('allLessonsLabel')"
          :backlink="
            group ? classRoute('ReportsGroupReportPage') : classRoute('ReportsLessonListPage')
          "
        >
          <template #dropdown>
            <LessonOptionsDropdownMenu
              optionsFor="report"
              @select="handleSelectOption"
            />
          </template>
        </QuizLessonDetailsHeader>
      </KGridItem>
      <KGridItem :layout12="{ span: $isPrint ? 12 : 4 }">
        <h2 class="visuallyhidden">
          {{ coachString('generalInformationLabel') }}
        </h2>
        <LessonStatus
          :className="className"
          :lesson="lesson"
          :groupNames="getRecipientNamesForExam(lesson)"
        />
      </KGridItem>
      <KGridItem :layout12="{ span: $isPrint ? 12 : 8 }">
        <h2 class="visuallyhidden">
          {{ coachString('detailsLabel') }}
        </h2>
        <KPageContainer :topMargin="$isPrint ? 0 : 24">
          <ReportsControls @export="exportCSV" />
          <HeaderTabs :enablePrint="true">
            <KTabsList
              ref="tabList"
              :tabsId="REPORTS_LESSON_TABS_ID"
              :ariaLabel="coachReportsLesson$()"
              :activeTabId="activeTabId"
              :tabs="tabs"
              @click="() => saveTabsClick(REPORTS_LESSON_TABS_ID)"
            />
          </HeaderTabs>
          <ReportsLessonResourcesList
            v-if="showResources"
            :entries="contentTable"
          />
          <ReportsLessonLearnersList
            v-else-if="showLearners"
            :entries="learnerTable"
          />
        </KPageContainer>
      </KGridItem>
    </KGrid>
  </CoachAppBarPage>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { coachStrings } from '../common/commonCoachStrings';
  import CoachAppBarPage from '../CoachAppBarPage';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import LessonOptionsDropdownMenu from '../plan/LessonSummaryPage/LessonOptionsDropdownMenu';
  import { REPORTS_LESSON_TABS_ID, ReportsLessonTabs } from '../../constants/tabsConstants';
  import { useCoachTabs } from '../../composables/useCoachTabs';
  import ReportsControls from './ReportsControls';
  import ReportsLessonLearnersList from './ReportsLessonLearnersList';
  import ReportsLessonResourcesList from './ReportsLessonResourcesList';

  export default {
    name: 'ReportsLessonBase',
    components: {
      CoachAppBarPage,
      ReportsControls,
      LessonOptionsDropdownMenu,
      ReportsLessonLearnersList,
      ReportsLessonResourcesList,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { coachReportsLesson$, avgTimeSpentLabel$ } = coachStrings;
      const { saveTabsClick, wereTabsClickedRecently } = useCoachTabs();
      return {
        saveTabsClick,
        wereTabsClickedRecently,
        avgTimeSpentLabel$,
        coachReportsLesson$,
      };
    },
    props: {
      showResources: {
        type: Boolean,
        default: false,
      },
      showLearners: {
        type: Boolean,
        default: false,
      },
      activeTabId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        REPORTS_LESSON_TABS_ID,
      };
    },
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      recipients() {
        return this.group
          ? this.getLearnersForGroups([this.group.id])
          : this.getLearnersForLesson(this.lesson);
      },
      group() {
        return this.$route.params.groupId && this.groupMap[this.$route.params.groupId];
      },
      contentTable() {
        const contentArray = this.lesson.node_ids.map(node_id => this.contentNodeMap[node_id]);
        return contentArray.map((content, index) => {
          if (!content) {
            return this.missingResourceObj(index);
          }
          const tally = this.getContentStatusTally(content.content_id, this.recipients);
          const tableRow = {
            avgTimeSpent: this.getContentAvgTimeSpent(content.content_id, this.recipients),
            tally,
            hasAssignments: Object.values(tally).reduce((a, b) => a + b, 0),
          };
          Object.assign(tableRow, content);
          const link = this.resourceLink(tableRow);
          if (link) {
            tableRow.link = link;
          }
          return tableRow;
        });
      },
      learnerTable() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = sortBy(learners, ['name']);
        return sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            status: this.getLessonStatusStringForLearner(this.lesson.id, learner.id),
            link: this.classRoute(
              this.group ? 'ReportsGroupReportLessonLearnerPage' : 'ReportsLessonLearnerPage',
              { learnerId: learner.id },
            ),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
      tabs() {
        return [
          {
            id: ReportsLessonTabs.REPORTS,
            label: this.coachString('reportsLabel'),
            to: this.group
              ? this.classRoute('ReportsGroupReportLessonPage')
              : this.classRoute('ReportsLessonReportPage'),
          },
          {
            id: ReportsLessonTabs.LEARNERS,
            label: this.coachString('learnersLabel'),
            to: this.group
              ? this.classRoute('ReportsGroupReportLessonLearnerListPage')
              : this.classRoute('ReportsLessonLearnerListPage'),
          },
        ];
      },
    },
    mounted() {
      // focus the active tab but only when it's likely
      // that this header was re-mounted as a result
      // of navigation after clicking a tab (focus shouldn't
      // be manipulated programatically in other cases, e.g.
      // when visiting the page for the first time)
      if (this.wereTabsClickedRecently(this.REPORTS_LESSON_TABS_ID)) {
        this.$nextTick(() => {
          this.$refs.tabList.focusActiveTab();
        });
      }
    },
    methods: {
      handleSelectOption(action) {
        if (action === 'EDIT_DETAILS') {
          this.$router.push(this.$router.getRoute('LessonReportEditDetailsPage'));
        }
        if (action === 'MANAGE_RESOURCES') {
          this.$router.push(
            this.$router.getRoute(
              'SELECTION_ROOT',
              {},
              // So the "X" and "Cancel" buttons return back to the ReportPage
              { last: this.$route.name },
            ),
          );
        }
        if (action === 'PRINT_REPORT') {
          this.$print();
        }
        if (action === 'EXPORT') {
          this.exportCSV();
        }
      },
      exportCSV() {
        if (this.showResources) {
          const columns = [
            ...csvFields.title(),
            ...csvFields.tally(),
            ...csvFields.timeSpent('avgTimeSpent', this.avgTimeSpentLabel$()),
          ];

          const exporter = new CSVExporter(columns, this.className);
          exporter.addNames({
            lesson: this.lesson.title,
          });
          if (this.group) {
            exporter.addNames({
              group: this.group.name,
            });
          }
          exporter.export(this.contentTable);
        } else if (this.showLearners) {
          const columns = [
            ...csvFields.name(),
            ...csvFields.learnerProgress(),
            ...csvFields.list('groups', 'groupsLabel'),
          ];

          const exporter = new CSVExporter(columns, this.className);
          exporter.addNames({
            lesson: this.lesson.title,
            learners: this.coachString('learnersLabel'),
          });
          exporter.export(this.learnerTable);
        }
      },
      resourceLink(resource) {
        if (resource.hasAssignments) {
          if (resource.kind === this.ContentNodeKinds.EXERCISE) {
            return this.classRoute(
              this.group
                ? 'ReportsGroupReportLessonExerciseLearnerListPage'
                : 'ReportsLessonExerciseLearnerListPage',
              { exerciseId: resource.content_id },
            );
          } else {
            return this.classRoute(
              this.group
                ? 'ReportsGroupReportLessonResourceLearnerListPage'
                : 'ReportsLessonResourceLearnerListPage',
              { resourceId: resource.content_id },
            );
          }
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';
  @import '../common/three-card-layout';

</style>
