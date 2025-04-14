<template>

  <CoachAppBarPage>
    <KPageContainer>
      <LearnerHeader />
    </KPageContainer>
    <KGrid>
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 2 }"
      >
        <KPageContainer class="content-spacing">
          <div style="display: flex; justify-content: space-between">
            <h2>{{ coachString('lessonsAssignedLabel') }}</h2>
            <ReportsControls
              :disablePrint="true"
              @export="exportCSVLessons"
            />
          </div>
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
                    <span v-if="quizLessonNotStarted(tableRow.status)">
                      <KIcon icon="lesson" />
                      {{ tableRow.title }}
                    </span>
                    <KRouterLink
                      v-else
                      :to="lessonLink(tableRow.id)"
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
        :layout4="{ span: 2 }"
      >
        <KPageContainer class="content-spacing">
          <div style="display: flex; justify-content: space-between">
            <h2>{{ coachString('quizzesAssignedLabel') }}</h2>
            <ReportsControls
              :disablePrint="true"
              @export="exportCSVQuizzes"
            />
          </div>
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
                    <span v-if="quizLessonNotStarted(tableRow.statusObj.status)">
                      <KIcon icon="quiz" />
                      {{ tableRow.title }}
                    </span>
                    <KRouterLink
                      v-else
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
    </KGrid>
  </CoachAppBarPage>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonCoach from '../../common';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import { STATUSES } from '../../../modules/classSummary/constants';
  import { PageNames } from '../../../constants';
  import ReportsControls from '../../common/ReportsControls';
  import CSVExporter from '../../../csv/exporter';
  import * as csvFields from '../../../csv/fields';
  import LearnerHeader from './LearnerHeader';

  export default {
    name: 'LearnerSummaryPage',
    components: {
      CoachAppBarPage,
      LearnerHeader,
      ReportsControls,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        lessonLimit: 10,
        quizLimit: 10,
      };
    },
    computed: {
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      getLessons() {
        return this.lessons.filter(lesson => this.isAssignedLesson(lesson));
      },
      getExam() {
        return this.exams.filter(exam => this.isAssignedQuiz(exam));
      },
      lessonsTable() {
        const sorted = this._.orderBy(this.getLessons, ['date_created'], ['desc']);
        const limitedResults = sorted.slice(0, this.lessonLimit);
        return limitedResults.map(lesson => {
          const tableRow = {
            status: this.getLessonStatusStringForLearner(lesson.id, this.learner.id),
          };
          Object.assign(tableRow, lesson);
          return tableRow;
        });
      },
      showViewMoreButton() {
        return this.getLessons.length !== this.lessonsTable.length && this.getLessons.length > 10;
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
      showQuizViewMoreButton() {
        return this.getExam.length !== this.examsTable.length && this.getExam.length > 2;
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
        return this.classRoute(PageNames.QUIZ_LEARNER_REPORT, {
          quizId,
          learnerId: this.learner.id,
          questionId: 0,
          interactionIndex: 0,
          tryIndex: 0,
        });
      },
      lessonLink(lessonId) {
        return this.classRoute(PageNames.LESSON_LEARNER_REPORT, { lessonId });
      },
      exportCSVLessons() {
        const filteredLessons = this.lessons
          .filter(lesson => this.getLearnersForLesson(lesson).includes(this.learner.id))
          .map(lesson => ({
            ...lesson,
            status: this.getLessonStatusStringForLearner(lesson.id, this.learner.id),
          }));

        const LessonColumn = [...csvFields.title(), ...csvFields.learnerProgress()];

        const LessonfileName = this.$tr('printLabel', { className: this.className });

        const LessonExporter = new CSVExporter(LessonColumn, LessonfileName);
        LessonExporter.addNames({
          learner: this.learner.name,
          report: 'Lesson',
        });

        LessonExporter.export(filteredLessons);
      },
      exportCSVQuizzes() {
        const filteredExams = this.exams
          .filter(exam => this.getLearnersForExam(exam).includes(this.learner.id))
          .map(exam => ({
            ...exam,
            statusObj: this.getExamStatusObjForLearner(exam.id, this.learner.id),
          }));

        const ExamColumn = [
          ...csvFields.title(),
          ...csvFields.learnerProgress('statusObj.status'),
          ...csvFields.score(),
        ];

        const ExamfileName = this.$tr('printLabel', { className: this.className });

        const ExamExporter = new CSVExporter(ExamColumn, ExamfileName);
        ExamExporter.addNames({
          learner: this.learner.name,
          report: 'Quizzes',
        });

        ExamExporter.export(filteredExams);
      },
      loadMoreLessonTable() {
        if (this.lessonLimit > 20) {
          this.lessonLimit = this.getLessons.length;
          return;
        }

        this.lessonLimit += 10;
      },
      loadMoreQuizzes() {
        if (this.quizLimit > 20) {
          this.quizLimit = this.getExam.length;
          return;
        }
        this.quizLimit += 10;
      },
      quizLessonNotStarted(status) {
        return status === STATUSES.notStarted;
      },
    },
    $trs: {
      printLabel: {
        message: '{className} Learners',
        context:
          "Title that displays on a printed copy of the 'Learners' > 'Learner' page. This shows if the user uses the 'Print' option by clicking on the printer icon.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  table {
    min-width: 0;
  }

  .content-spacing {
    width: 100%;
    height: 100%;
    padding: 24px 24px 16px;
  }

</style>
