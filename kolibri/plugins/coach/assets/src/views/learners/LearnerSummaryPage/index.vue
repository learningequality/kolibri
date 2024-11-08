<template>

  <CoachAppBarPage>
    <KPageContainer>
      <LearnerHeader />
    </KPageContainer>
    <KGrid >
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
      >
        <KPageContainer class="content-spacing left-container">
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
          <KButton
            v-if="showViewMoreButton"
            :text="coreString('viewMoreAction')"
            appearance="raised-button"
            @click="loadMoreLessonTable()"
          />
        </KPageContainer>
      </KGridItem>

      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
      >
        <KPageContainer class="content-spacing right-container">
          <h2>{{ coachString('quizzesAssignedLabel') }} </h2>
          <CoreTable :emptyMessage="coachString('quizListEmptyState')">
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
          <KButton
            v-if="showQuizViewMoreButton"
            :text="coreString('viewMoreAction')"
            appearance="raised-button"
            @click="loadMoreQuizzes"
          />
        </KPageContainer>
      </KGridItem>
      <KPageContainer class="right-container">
        <KGrid>
          <KGridItem :layout12="{ span: $isPrint ? 12 : 6 }">
            <h2>{{ coachString('quizzesAssignedLabel') }}</h2>
            <CoreTable
              :class="{ print: $isPrint }"
              :emptyMessage="coachString('quizListEmptyState')"
            >
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
                      <StatusSimple :status="tableRow.statusObj" />
                    </td>
                  </tr>
                </transition-group>
              </template>
            </CoreTable>
            <KButton
              v-if="showQuizViewMoreButton"
              :text="coreString('viewMoreAction')"
              appearance="raised-button"
              @click="loadMoreQuizzes"
            />
          </KGridItem>
        </KGrid>
      </KPageContainer>
    </KGrid>
  </CoachAppBarPage>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import { PageNames } from '../../constants';
  import ReportsLearnerHeader from './ReportsLearnerHeader';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonCoach from '../../common';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import { PageNames } from '../../../constants';
  import { REPORTS_LEARNERS_TABS_ID, ReportsLearnersTabs } from '../../../constants/tabsConstants';
  import { useCoachTabs } from '../../../composables/useCoachTabs';
  import LearnerHeader from './LearnerHeader';

  export default {
    name: 'LearnerSummaryPage',
    components: {
      CoachAppBarPage,
      LearnerHeader,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        limit: 10,
        quizLimit:10,
      };
    },
    computed: {
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      getLessons(){
        return this.lessons.filter(lesson => this.isAssignedLesson(lesson));
      },
      getExam(){
        return this.exams.filter(exam => this.isAssignedQuiz(exam));
      },
      lessonsTable() {
        const sorted = this._.orderBy(this.getLessons, ['date_created'], ['desc']);
        const limitedResults = sorted.slice(0, this.limit);
        return limitedResults.map(lesson => {
          const tableRow = {
            status: this.getLessonStatusStringForLearner(lesson.id, this.learner.id),
          };
          Object.assign(tableRow, lesson);
          return tableRow;
        });
      },
      showViewMoreButton(){
        return (this.getLessons.length !== this.lessonsTable.length) && this.getLessons.length > 10;
      },
      examsTable() {
        const sorted = this._.orderBy(this.getExam, ['date_created'], ['desc']);
        const limitedQuizResults = sorted.slice(0, this.quizLimit);
        return limitedQuizResults.map(exam => {
          const tableRow = {
            statusObj: this.getExamStatusObjForLearner(exam.id, this.learner.id),
          };
          Object.assign(tableRow, exam);
          return tableRow;
        });
      },
      showQuizViewMoreButton(){
        return (this.getExam.length !== this.examsTable.length) && this.getExam.length > 2;
      },
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
      loadMoreLessonTable(){
        if(this.limit > 20){
          this.limit = this.getLessons.length;
          return;
        }

        this.limit += 10;
      },
      loadMoreQuizzes(){
        if(this.quizLimit > 20){
          this.quizLimit = this.getExam.length;
          return;
        }
        this.quizLimit += 10;
      }
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  table {
    min-width: 0;
  }
  .left-container {
    width: 100%;
    height: 100%;
  }
  .right-container {
    width: 100%;
    height: 100%;
  }
  .content-spacing {
    padding: 24px 24px 16px 24px;
  }

</style>
