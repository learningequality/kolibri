<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsLearnerHeader />

      <KGrid>
        <KGridItem :sizes="[100, 100, 50]" percentage>
          <h2>{{ coachCommon$tr('lessonsAssignedLabel') }}</h2>
          <CoreTable :emptyMessage="coachCommon$tr('lessonListEmptyState')">
            <thead slot="thead">
              <tr>
                <th>{{ coachCommon$tr('titleLabel') }}</th>
                <th>{{ coachCommon$tr('progressLabel') }}</th>
              </tr>
            </thead>
            <transition-group slot="tbody" tag="tbody" name="list">
              <tr v-for="tableRow in lessonsTable" :key="tableRow.id">
                <td>
                  <KLabeledIcon>
                    <KIcon slot="icon" lesson />
                    <KRouterLink
                      :to="classRoute('ReportsLearnerReportLessonPage', { lessonId: tableRow.id })"
                      :text="tableRow.title"
                    />
                  </KLabeledIcon>
                </td>
                <td>
                  <StatusSimple :status="tableRow.status" />
                </td>
              </tr>
            </transition-group>
          </CoreTable>
        </KGridItem>
        <KGridItem :sizes="[100, 100, 50]" percentage>
          <h2>{{ coachCommon$tr('quizzesAssignedLabel') }}</h2>
          <CoreTable :emptyMessage="coachCommon$tr('quizListEmptyState')">
            <thead slot="thead">
              <tr>
                <th>{{ coachCommon$tr('titleLabel') }}</th>
                <th>{{ coachCommon$tr('progressLabel') }}</th>
                <th>{{ coachCommon$tr('scoreLabel') }}</th>
              </tr>
            </thead>
            <transition-group slot="tbody" tag="tbody" name="list">
              <tr v-for="tableRow in examsTable" :key="tableRow.id">
                <td>
                  <KLabeledIcon>
                    <KIcon slot="icon" quiz />
                    <KRouterLink
                      :to="quizLink(tableRow.id)"
                      :text="tableRow.title"
                    />
                  </KLabeledIcon>
                </td>
                <td>
                  <StatusSimple :status="tableRow.statusObj.status" />
                </td>
                <td><Score :value="tableRow.statusObj.score" /></td>
              </tr>
            </transition-group>
          </CoreTable>
        </KGridItem>
      </KGrid>

    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import ReportsLearnerHeader from './ReportsLearnerHeader';

  export default {
    name: 'ReportsLearnerReportPage',
    components: {
      ReportsLearnerHeader,
    },
    mixins: [commonCoach],
    computed: {
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      lessonsTable() {
        const filtered = this.lessons.filter(lesson => this.isAssigned(lesson.groups));
        const sorted = this._.sortBy(filtered, ['title', 'active']);
        return sorted.map(lesson => {
          const tableRow = {
            status: this.getLessonStatusStringForLearner(lesson.id, this.learner.id),
          };
          Object.assign(tableRow, lesson);
          return tableRow;
        });
      },
      examsTable() {
        const filtered = this.exams.filter(exam => this.isAssigned(exam.groups));
        const sorted = this._.sortBy(filtered, ['title', 'active']);
        return sorted.map(exam => {
          const tableRow = {
            statusObj: this.getExamStatusObjForLearner(exam.id, this.learner.id),
          };
          Object.assign(tableRow, exam);
          return tableRow;
        });
      },
    },
    methods: {
      isAssigned(groupIds) {
        return this.getLearnersForGroups(groupIds).includes(this.learner.id);
      },
      quizLink(quizId) {
        return this.classRoute(PageNames.REPORTS_LEARNER_REPORT_QUIZ_PAGE_ROOT, { quizId });
      },
    },
  };

</script>


<style lang="scss" scoped>

  table {
    min-width: 0;
  }

</style>
