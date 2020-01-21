<template>

  <Block
    :allLinkText="coachString('viewAllAction')"
    :allLinkRoute="classRoute('ReportsQuizListPage', {})"
    :showAllLink="table.length > 0"
  >
    <KLabeledIcon slot="title" icon="quiz" :label="coreString('quizzesLabel')" />

    <p v-if="table.length === 0">
      {{ coachString('quizListEmptyState') }}
    </p>

    <BlockItem
      v-for="tableRow in table"
      :key="tableRow.key"
    >
      <ItemProgressDisplay
        :name="tableRow.name"
        :tally="tableRow.tally"
        :groupNames="groupAndAdHocLearnerNames(tableRow.groups, tableRow.assignments)"
        :hasAssignments="tableRow.hasAssignments"
        :to="classRoute('ReportsQuizLearnerListPage', { quizId: tableRow.key })"
      />
    </BlockItem>
  </Block>

</template>


<script>

  import orderBy from 'lodash/orderBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
    mixins: [commonCoach, commonCoreStrings],
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
            assignments: exam.assignments,
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
      groupAndAdHocLearnerNames(groups, assignments) {
        const adHocGroup = this.adHocGroups.find(group => assignments.includes(group.id));
        let adHocLearners = [];
        if (adHocGroup) {
          adHocLearners = adHocGroup.member_ids.map(learnerId => this.learnerMap[learnerId].name);
        }
        return groups.concat(adHocLearners);
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
