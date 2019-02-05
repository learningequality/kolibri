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
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('questionLabel') }}</td>
            <td>{{ coachStrings.$tr('helpNeededLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="(tableRow, index) in table" :key="tableRow.question_id">
            <td>
              <KRouterLink
                :text="questionTitle(index + 1)"
                :to="questionLink(tableRow.question_id, index)"
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

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import ExamReport from 'kolibri.coreVue.components.ExamReport';
  import commonCoach from '../common';
  import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  import ReportsLessonExerciseHeader from './ReportsLessonExerciseHeader';

  const examStrings = crossComponentTranslator(ExamReport);

  export default {
    name: 'ReportsLessonExerciseQuestionListPage',
    components: {
      ReportsLessonExerciseHeader,
      LearnerProgressRatio,
    },
    mixins: [commonCoach],
    data() {
      return {
        difficultQuestions: [
          {
            question_id: 'item_id1',
            exercise_id: 'c4cd5ea6e61a588d9436d175cb13b935',
            total: 5,
            correct: 0,
          },
          {
            question_id: 'item_id2',
            exercise_id: 'c4cd5ea6e61a588d9436d175cb13b935',
            total: 3,
            correct: 1,
          },
          {
            question_id: 'item_id3',
            exercise_id: 'c4cd5ea6e61a588d9436d175cb13b935',
            total: 30,
            correct: 20,
          },
          {
            question_id: 'item_id4',
            exercise_id: 'c4cd5ea6e61a588d9436d175cb13b935',
            total: 15,
            correct: 5,
          },
        ],
      };
    },
    computed: {
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
      questionLink(questionId, interactionIndex) {
        return this.classRoute('ReportsLessonExerciseQuestionPage', {
          questionId,
          interactionIndex,
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
