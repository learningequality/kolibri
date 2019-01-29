<template>

  <Block
    :title="coachStrings.$tr('quizzesLabel')"
    :allLinkText="$tr('viewAll')"
    :allLinkRoute="classRoute('ReportsQuizListPage', {})"
  >
    <ContentIcon slot="icon" :kind="ContentNodeKinds.EXAM" />
    <div
      v-for="quiz in recentQuizzes"
      :key="quiz.key"
      class="block-item"
    >
      <ItemProgressDisplay
        :name="quiz.name"
        :completed="quiz.completed"
        :total="quiz.total"
        :groups="quiz.groups"
      />
    </div>
  </Block>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import sortBy from 'lodash/sortBy';
  import commonCoach from '../../common';
  import Block from './Block';
  import ItemProgressDisplay from './ItemProgressDisplay';

  const MAX_QUIZZES = 3;

  export default {
    name: 'QuizzesBlock',
    components: {
      ItemProgressDisplay,
      Block,
    },
    mixins: [commonCoach],
    $trs: {
      viewAll: 'All quizzes',
    },
    computed: {
      ...mapState('classSummary', ['groupMap', 'examLearnerStatusMap']),
      ...mapGetters('classSummary', ['learners', 'exams', 'getExamStatusCounts']),
      recentQuizzes() {
        const recent = sortBy(this.exams, this.lastActivity).slice(0, MAX_QUIZZES);
        return recent.map(exam => {
          const assigned = this.assignedLearnerIds(exam);
          return {
            key: exam.id,
            name: exam.title,
            completed: this.numCompleted(exam.id, assigned),
            total: assigned.length,
            groups: exam.groups.map(groupId => this.groupMap[groupId].name),
          };
        });
      },
    },
    methods: {
      assignedLearnerIds(exam) {
        // assigned to the whole class
        if (!exam.groups.length) {
          return this.learners.map(learner => learner.id);
        }
        // accumulate learner IDs of groups
        const learnerIds = [];
        exam.groups.forEach(groupId => {
          learnerIds.push(...this.groupMap[groupId].member_ids);
        });
        return learnerIds;
      },
      // return the number of learners who have completed the exam
      numCompleted(examId, assignedLearnerIds) {
        return this.getExamStatusCounts(examId, assignedLearnerIds)[this.STATUSES.completed];
      },
      // return the last activity among all users for a particular exam
      lastActivity(exam) {
        let last = null;
        if (!this.examLearnerStatusMap[exam.id]) {
          return undefined;
        }
        Object.values(this.examLearnerStatusMap[exam.id]).forEach(status => {
          if (status.last_activity > last) {
            last = status.last_activity;
          }
        });
        return last;
      },
    },
  };

</script>


<style lang="scss" scoped></style>

