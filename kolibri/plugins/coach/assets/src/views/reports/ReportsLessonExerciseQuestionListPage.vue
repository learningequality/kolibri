<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsLessonExerciseHeader />

      <!-- TODO COACH
        <KCheckbox :label="coachStrings.$tr('viewByGroupsLabel')" />
      -->

      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
      <CoreTable :emptyMessage="coachStrings.$tr('questionListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachStrings.$tr('questionLabel') }}</th>
            <th>{{ coachStrings.$tr('helpNeededLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="(tableRow, index) in table" :key="tableRow.question_id">
            <td>
              <KRouterLink
                :text="questionTitle(index + 1)"
                :to="questionLink(tableRow.question_id)"
              />
            </td>
            <td>
              <LearnerProgressRatio
                :verb="VERBS.needHelp"
                :icon="ICONS.help"
                :total="tableRow.total"
                :count="tableRow.total - tableRow.correct"
                :verbosity="1"
              />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import ExamReport from 'kolibri.coreVue.components.ExamReport';
  import commonCoach from '../common';
  import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  import ReportsLessonExerciseHeader from './ReportsLessonExerciseHeader';
  import { PageNames } from './../../constants';

  const examStrings = crossComponentTranslator(ExamReport);

  export default {
    name: 'ReportsLessonExerciseQuestionListPage',
    components: {
      ReportsLessonExerciseHeader,
      LearnerProgressRatio,
    },
    mixins: [commonCoach],
    computed: {
      ...mapGetters('questionList', ['difficultQuestions']),
      table() {
        const mapped = this.difficultQuestions.map(question => {
          const tableRow = {};
          Object.assign(tableRow, question);
          return tableRow;
        });
        return mapped;
      },
    },
    methods: {
      questionLink(questionId) {
        return this.classRoute(PageNames.REPORTS_LESSON_EXERCISE_QUESTION_PAGE_ROOT, {
          questionId,
          exerciseId: this.$route.params.exerciseId,
        });
      },
      questionTitle(questionNumber) {
        return examStrings.$tr('question', { questionNumber });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
