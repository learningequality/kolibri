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
            <span v-if="$isPrint">{{ tableRow.title }}</span>
            <KRouterLink
              v-if="!isMissingResource"
              :text="tableRow.title"
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

  import commonCoach from '../common';
  import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  import { coachStrings } from '../common/commonCoachStrings';
  import { PageNames } from './../../constants';

  export default {
    name: 'ReportsDifficultQuestionsTable',
    components: {
      LearnerProgressRatio,
    },
    mixins: [commonCoach],
    setup() {
      const { questionListEmptyState$, questionLabel$, helpNeededLabel$ } = coachStrings;

      return {
        questionListEmptyState$,
        questionLabel$,
        helpNeededLabel$,
      };
    },
    props: {
      entries: {
        type: Array,
        default: () => [],
      },
      isMissingResource: {
        type: Boolean,
        default: false,
      },
    },
    methods: {
      questionLink(questionId) {
        return this.classRoute(
          this.group
            ? PageNames.REPORTS_GROUP_REPORT_QUIZ_QUESTION_PAGE_ROOT
            : PageNames.REPORTS_QUIZ_QUESTION_PAGE_ROOT,
          {
            questionId,
            quizId: this.$route.params.quizId,
          },
        );
      },
    },
  };

</script>
