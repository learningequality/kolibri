<template>

  <Block
    :allLinkText="$tr('viewAll')"
    :allLinkRoute="classRoute('ReportsLessonListPage', {})"
  >
    <KLabeledIcon slot="title">
      <KIcon slot="icon" lesson />
      {{ coachCommon$tr('lessonsLabel') }}
    </KLabeledIcon>

    <p v-if="table.length === 0">
      {{ coachCommon$tr('lessonListEmptyState') }}
    </p>

    <BlockItem
      v-for="tableRow in table"
      :key="tableRow.key"
      class="block-item"
    >
      <ItemProgressDisplay
        :name="tableRow.name"
        :tally="tableRow.tally"
        :groupNames="tableRow.groups"
        :hasAssignments="tableRow.hasAssignments"
        :to="classRoute('ReportsLessonLearnerListPage', { lessonId: tableRow.key })"
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

  const MAX_LESSONS = 3;

  export default {
    name: 'LessonsBlock',
    components: {
      ItemProgressDisplay,
      Block,
      BlockItem,
    },
    mixins: [commonCoach],
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
    },
    $trs: {
      viewAllLessons: 'All lessons',
      viewAll: 'View all',
    },
  };

</script>


<style lang="scss" scoped></style>
