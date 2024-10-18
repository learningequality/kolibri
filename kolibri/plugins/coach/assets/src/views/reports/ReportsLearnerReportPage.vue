<template>

  <CoachAppBarPage>
    <KPageContainer>
      <ReportsLearnerHeader />
    </KPageContainer>

    <KPageContainer>
      <HeaderTabs>
        <KTabsList
          ref="tabList"
          :tabsId="REPORTS_LEARNERS_TABS_ID"
          :ariaLabel="$tr('reportLearners')"
          :activeTabId="ReportsLearnersTabs.REPORTS"
          :tabs="tabs"
          @click="() => saveTabsClick(REPORTS_LEARNERS_TABS_ID)"
        />
      </HeaderTabs>
      <KTabsPanel
        :tabsId="REPORTS_LEARNERS_TABS_ID"
        :activeTabId="ReportsLearnersTabs.REPORTS"
      >
        <KGrid>
          <KGridItem :layout12="{ span: $isPrint ? 12 : 6 }">
            <h2>{{ coachString('lessonsAssignedLabel') }}</h2>
            <CoreTable :emptyMessage="coachString('lessonListEmptyState')">
              <template #headers>
                <th>{{ coachString('titleLabel') }}</th>
                <th>{{ coreString('progressLabel') }}</th>
              </template>
              <template #tbody>
                <transition-group
                  tag="tbody"
                  name="list"
                >
                  <tr
                    v-for="tableRow in lessonsTable"
                    :key="tableRow.id"
                  >
                    <td>
                      <KRouterLink
                        :to="
                          classRoute('ReportsLearnerReportLessonPage', {
                            lessonId: tableRow.id,
                          })
                        "
                        :text="tableRow.title"
                        icon="lesson"
                      />
                    </td>
                    <td>
                      <StatusSimple :status="tableRow.status" />
                    </td>
                  </tr>
                </transition-group>
              </template>
            </CoreTable>
          </KGridItem>
          <KGridItem :layout12="{ span: $isPrint ? 12 : 6 }">
            <h2>{{ coachString('quizzesAssignedLabel') }}</h2>
            <CoreTable
              :class="{ print: $isPrint }"
              :emptyMessage="coachString('quizListEmptyState')"
            >
              <template #headers>
                <th>{{ coachString('titleLabel') }}</th>
                <th>{{ coreString('progressLabel') }}</th>
                <th>{{ coreString('scoreLabel') }}</th>
              </template>
              <template #tbody>
                <transition-group
                  tag="tbody"
                  name="list"
                >
                  <tr
                    v-for="tableRow in examsTable"
                    :key="tableRow.id"
                  >
                    <td>
                      <KRouterLink
                        :to="quizLink(tableRow.id)"
                        :text="tableRow.title"
                        icon="quiz"
                      />
                    </td>
                    <td>
                      <StatusSimple :status="tableRow.statusObj.status" />
                    </td>
                    <td>
                      <Score :value="tableRow.statusObj.score" />
                    </td>
                  </tr>
                </transition-group>
              </template>
            </CoreTable>
          </KGridItem>
        </KGrid>
      </KTabsPanel>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import { PageNames } from '../../constants';
  import { REPORTS_LEARNERS_TABS_ID, ReportsLearnersTabs } from '../../constants/tabsConstants';
  import { useCoachTabs } from '../../composables/useCoachTabs';
  import ReportsLearnerHeader from './ReportsLearnerHeader';

  export default {
    name: 'ReportsLearnerReportPage',
    components: {
      CoachAppBarPage,
      ReportsLearnerHeader,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { saveTabsClick, wereTabsClickedRecently } = useCoachTabs();
      return {
        saveTabsClick,
        wereTabsClickedRecently,
      };
    },
    data() {
      return {
        REPORTS_LEARNERS_TABS_ID,
        ReportsLearnersTabs,
      };
    },
    computed: {
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      lessonsTable() {
        const filtered = this.lessons.filter(lesson => this.isAssignedLesson(lesson));
        const sorted = this._.orderBy(filtered, ['date_created'], ['desc']);
        return sorted.map(lesson => {
          const tableRow = {
            status: this.getLessonStatusStringForLearner(lesson.id, this.learner.id),
          };
          Object.assign(tableRow, lesson);
          return tableRow;
        });
      },
      examsTable() {
        const filtered = this.exams.filter(exam => this.isAssignedQuiz(exam));
        const sorted = this._.orderBy(filtered, ['date_created'], ['desc']);
        return sorted.map(exam => {
          const tableRow = {
            statusObj: this.getExamStatusObjForLearner(exam.id, this.learner.id),
          };
          Object.assign(tableRow, exam);
          return tableRow;
        });
      },
      tabs() {
        return [
          {
            id: ReportsLearnersTabs.REPORTS,
            label: this.coachString('reportsLabel'),
            to: this.classRoute('ReportsLearnerReportPage', {}),
          },
          {
            id: ReportsLearnersTabs.ACTIVITY,
            label: this.coachString('activityLabel'),
            to: this.classRoute('ReportsLearnerActivityPage', {}),
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
      if (this.wereTabsClickedRecently(this.REPORTS_LEARNERS_TABS_ID)) {
        this.$nextTick(() => {
          this.$refs.tabList.focusActiveTab();
        });
      }
    },
    methods: {
      isAssignedLesson(lesson) {
        return this.getLearnersForLesson(lesson).includes(this.learner.id);
      },
      isAssignedQuiz(quiz) {
        return this.getLearnersForExam(quiz).includes(this.learner.id);
      },
      quizLink(quizId) {
        return this.classRoute(PageNames.REPORTS_LEARNER_REPORT_QUIZ_PAGE_ROOT, { quizId });
      },
    },
    $trs: {
      reportLearners: {
        message: 'Report learners',
        context: 'Labels the Reports > Learners tab for screen reader users',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  table {
    min-width: 0;
  }

</style>
