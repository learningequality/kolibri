<template>

  <Block
    :title="coachStrings.$tr('quizzesLabel')"
    :allLinkText="viewAllString"
    :allLinkRoute="classRoute('ReportsQuizListPage', {})"
  >
    <ContentIcon slot="icon" :kind="ContentNodeKinds.EXAM" />
    <div
      v-for="tableRow in table"
      :key="tableRow.key"
      class="block-item"
    >
      <ItemProgressDisplay
        :name="tableRow.name"
        :tallyObject="tableRow.statusCounts"
        :groups="tableRow.groups"
      />
    </div>
  </Block>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import orderBy from 'lodash/orderBy';
  import commonCoach from '../../common';
  import Block from './Block';
  import ItemProgressDisplay from './ItemProgressDisplay';
  import ActivityBlock from './ActivityBlock';

  const viewAllString = crossComponentTranslator(ActivityBlock).$tr('viewAll');
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
      table() {
        const recent = orderBy(this.exams, this.lastActivity, ['desc']).slice(0, MAX_QUIZZES);
        return recent.map(exam => {
          const assigned = this.assignedLearnerIds(exam);
          return {
            key: exam.id,
            name: exam.title,
            statusCounts: this.getExamStatusCounts(exam.id, assigned),
            groups: exam.groups.map(groupId => this.groupMap[groupId].name),
          };
        });
      },
      viewAllString() {
        return viewAllString;
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

