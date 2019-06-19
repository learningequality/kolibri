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
        <KCheckbox :label="coachCommon$tr('viewByGroupsLabel')" />
      -->

      <h2>{{ coachCommon$tr('overallLabel') }}</h2>
      <CoreTable :emptyMessage="coachCommon$tr('questionListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachCommon$tr('questionLabel') }}</th>
            <th>{{ coachCommon$tr('helpNeededLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.question_id">
            <td>
              <KRouterLink
                :text="tableRow.title"
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
  import commonCoach from '../common';
  import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  import ReportsLessonExerciseHeader from './ReportsLessonExerciseHeader';
  import { PageNames } from './../../constants';

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
        return this.difficultQuestions.map(question => {
          const tableRow = {};
          Object.assign(tableRow, question);
          return tableRow;
        });
      },
    },
    methods: {
      questionLink(questionId) {
        return this.classRoute(PageNames.REPORTS_LESSON_EXERCISE_QUESTION_PAGE_ROOT, {
          questionId,
          exerciseId: this.$route.params.exerciseId,
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
