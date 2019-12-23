<template>

  <Block
    :allLinkText="coachString('viewAllAction')"
    :allLinkRoute="classRoute('ReportsLessonListPage', {})"
    :showAllLink="table.length > 0"
  >
    <KLabeledIcon slot="title" icon="lesson" :label="coreString('lessonsLabel')" />

    <p v-if="table.length === 0">
      {{ coachString('lessonListEmptyState') }}
    </p>

    <BlockItem
      v-for="tableRow in table"
      :key="tableRow.key"
      class="block-item"
    >
      <ItemProgressDisplay
        :name="tableRow.name"
        :tally="tableRow.tally"
        :groupNames="groupAndAdHocLearnerNames(tableRow.groups, tableRow.assignments)"
        :hasAssignments="tableRow.hasAssignments"
        :to="classRoute('ReportsLessonLearnerListPage', { lessonId: tableRow.key })"
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

  const MAX_LESSONS = 3;

  export default {
    name: 'LessonsBlock',
    components: {
      ItemProgressDisplay,
      Block,
      BlockItem,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      table() {
        const recent = orderBy(this.lessons, this.lastActivity, ['desc']).slice(0, MAX_LESSONS);
        return recent.map(lesson => {
          const assigned = this.getLearnersForLesson(lesson);
          return {
            key: lesson.id,
            name: lesson.title,
            tally: this.getLessonStatusTally(lesson.id, assigned),
            groups: lesson.groups.map(groupId => this.groupMap[groupId].name),
            hasAssignments: assigned.length > 0,
            assignments: lesson.assignments,
          };
        });
      },
    },
    methods: {
      // return the last activity among all users for a particular lesson
      lastActivity(lesson) {
        // Default to UNIX 0 so activity-less lessons go to the end of the list
        let last = new Date(0);
        if (!this.lessonLearnerStatusMap[lesson.id]) {
          return last;
        }
        Object.values(this.lessonLearnerStatusMap[lesson.id]).forEach(learner => {
          if (learner.last_activity > last) {
            last = learner.last_activity;
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
