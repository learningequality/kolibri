<template>

  <CoreTable :emptyMessage="questionListEmptyState$()">
    <template #headers>
      <th>{{ questionLabel$() }}</th>
      <th>{{ helpNeededLabel$() }}</th>
    </template>
    <template #tbody>
      <transition-group
        tag="tbody"
        name="list"
      >
        <tr
          v-for="(tableRow, index) in entries"
          :key="tableRow.item + index"
        >
          <td>
            <span v-if="$isPrint">{{ getQuestionTitle(tableRow) }}</span>
            <KRouterLink
              v-if="!exam.missing_resource"
              :text="getQuestionTitle(tableRow)"
              :to="questionLink(tableRow.item)"
              icon="question"
            />
            <span v-else> <KIcon icon="question" />{{ tableRow.title }} </span>
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
    </template>
  </CoreTable>

</template>


<script>

  import commonCoach from '../../../common';
  import LearnerProgressRatio from '../../../common/status/LearnerProgressRatio';
  import { coachStrings } from '../../../common/commonCoachStrings';
  import * as csvFields from '../../../../csv/fields';
  import CSVExporter from '../../../../csv/exporter';
  import { PageNames } from '../../../../constants';

  export default {
    name: 'ReportsDifficultQuestionsTable',
    components: {
      LearnerProgressRatio,
    },
    mixins: [commonCoach],
    setup() {
      const { questionListEmptyState$, questionLabel$, helpNeededLabel$, nthExerciseName$ } =
        coachStrings;

      return {
        questionListEmptyState$,
        questionLabel$,
        helpNeededLabel$,
        nthExerciseName$,
      };
    },
    props: {
      entries: {
        type: Array,
        default: () => [],
      },
    },
    computed: {
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      group() {
        return this.$route.params.groupId && this.groupMap[this.$route.params.groupId];
      },
    },
    methods: {
      questionLink(questionId) {
        return this.classRoute(PageNames.QUIZ_QUESTION_PAGE_ROOT, {
          questionId,
          quizId: this.$route.params.quizId,
        });
      },
      getQuestionTitle(question) {
        return this.nthExerciseName$({
          name: question.title,
          number: question.questionNumber,
        });
      },
      /**
       * @public
       */
      exportCSV() {
        const columns = [...csvFields.questionTitle(), ...csvFields.helpNeeded()];

        const exporter = new CSVExporter(columns, this.className);
        const names = {
          resource: this.exam.title,
          difficultQuestions: this.coachString('difficultQuestionsLabel'),
        };

        if (this.group) {
          names.group = this.group.name;
        }
        exporter.addNames(names);

        exporter.export(this.entries);
      },
    },
  };

</script>
