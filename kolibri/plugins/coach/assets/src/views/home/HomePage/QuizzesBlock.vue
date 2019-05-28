<template>

  <Block
    :allLinkText="$tr('viewAll')"
    :allLinkRoute="classRoute('ReportsQuizListPage', {})"
  >
    <KLabeledIcon slot="title">
      <KIcon slot="icon" quiz />
      {{ common$tr('quizzesLabel') }}
    </KLabeledIcon>

    <p v-if="table.length === 0">
      {{ common$tr('quizListEmptyState') }}
    </p>

    <BlockItem
      v-for="tableRow in table"
      :key="tableRow.key"
    >
      <ItemProgressDisplay
        :name="tableRow.name"
        :tally="tableRow.tally"
        :groupNames="tableRow.groups"
        :hasAssignments="tableRow.hasAssignments"
        :to="classRoute('ReportsQuizLearnerListPage', { quizId: tableRow.key })"
      />
    </BlockItem>
  </Block>

</template>


<script>

  import orderBy from 'lodash/orderBy';
  import commonCoach from '../../common';
  import Block from './Block';
  import BlockItem from './BlockItem';
  import ItemProgressDisplay from './ItemProgressDisplay';

  const MAX_QUIZZES = 3;

  export default {
    name: 'QuizzesBlock',
    components: {
      ItemProgressDisplay,
      Block,
      BlockItem,
    },
    mixins: [commonCoach],
    computed: {
      table() {
        const recent = orderBy(this.exams, this.lastActivity, ['desc']).slice(0, MAX_QUIZZES);
        return recent.map(exam => {
          const assigned = this.getLearnersForExam(exam);
          return {
            key: exam.id,
            name: exam.title,
            tally: this.getExamStatusTally(exam.id, assigned),
            groups: exam.groups.map(groupId => this.groupMap[groupId].name),
            hasAssignments: assigned.length > 0,
          };
        });
      },
    },
    methods: {
      // return the last activity among all users for a particular exam
      lastActivity(exam) {
        // Default to UNIX 0 so activity-less exams go to the end of the list
        let last = new Date(0);
        if (!this.examLearnerStatusMap[exam.id]) {
          return last;
        }
        Object.values(this.examLearnerStatusMap[exam.id]).forEach(status => {
          if (status.last_activity > last) {
            last = status.last_activity;
          }
        });
        return last;
      },
    },
    $trs: {
      viewAllQuizzes: 'All quizzes',
      viewAll: 'View all',
    },
  };

</script>


<style lang="scss" scoped></style>
