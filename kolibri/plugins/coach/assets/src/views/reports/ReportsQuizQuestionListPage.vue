<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsQuizHeader />

      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>{{ coachStrings.$tr('questionLabel') }}</th>
            <th>{{ coachStrings.$tr('helpNeededLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="(tableRow, index) in table" :key="tableRow.question_id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" question />
                <KRouterLink
                  :text="questionTitle(index + 1)"
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
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import ExamReport from 'kolibri.coreVue.components.ExamReport';
  import commonCoach from '../common';
  import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  import ReportsQuizHeader from './ReportsQuizHeader';
  import { PageNames } from './../../constants';

  const examStrings = crossComponentTranslator(ExamReport);

  export default {
    name: 'ReportsQuizQuestionListPage',
    components: {
      ReportsQuizHeader,
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
        return this.classRoute(PageNames.REPORTS_QUIZ_QUESTION_PAGE_ROOT, {
          questionId,
          quizId: this.$route.params.quizId,
        });
      },
      questionTitle(questionNumber) {
        return examStrings.$tr('question', { questionNumber });
      },
    },
    $trs: {
      avgTimeSpentLabel: 'Average time spent',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
