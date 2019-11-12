<template>

  <ReportsQuizBaseListPage>
    <div>
      <h2>{{ coachString('overallLabel') }}</h2>
      <CoreTable :emptyMessage="coachString('questionListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('questionLabel') }}</th>
            <th>{{ coachString('helpNeededLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="(tableRow, index) in table" :key="tableRow.question_id + index">
            <td>
              <KLabeledIcon icon="question">
                <KRouterLink
                  :text="tableRow.title"
                  :to="questionLink(tableRow.question_id)"
                />
              </KLabeledIcon>
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
    </div>
  </ReportsQuizBaseListPage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoach from '../common';
  import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  import ReportsQuizBaseListPage from './ReportsQuizBaseListPage';
  import { PageNames } from './../../constants';

  export default {
    name: 'ReportsQuizQuestionListPage',
    components: {
      LearnerProgressRatio,
      ReportsQuizBaseListPage,
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
        return this.classRoute(PageNames.REPORTS_QUIZ_QUESTION_PAGE_ROOT, {
          questionId,
          quizId: this.$route.params.quizId,
        });
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
