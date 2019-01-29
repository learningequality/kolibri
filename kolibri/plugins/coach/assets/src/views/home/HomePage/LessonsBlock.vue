<template>

  <Block
    :title="coachStrings.$tr('lessonsLabel')"
    :allLinkText="viewAllString"
    :allLinkRoute="classRoute('ReportsLessonListPage', {})"
  >
    <ContentIcon slot="icon" :kind="ContentNodeKinds.LESSON" />
    <div
      v-for="tableRow in table"
      :key="tableRow.key"
      class="block-item"
    >
      <ItemProgressDisplay
        :name="tableRow.name"
        :completed="tableRow.completed"
        :total="tableRow.total"
        :groups="tableRow.groups"
      />
    </div>
  </Block>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import orderBy from 'lodash/orderBy';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import commonCoach from '../../common';
  import Block from './Block';
  import ItemProgressDisplay from './ItemProgressDisplay';
  import ActivityBlock from './ActivityBlock';

  const MAX_LESSONS = 3;

  const viewAllString = crossComponentTranslator(ActivityBlock).$tr('viewAll');

  export default {
    name: 'LessonsBlock',
    components: {
      ItemProgressDisplay,
      Block,
    },
    mixins: [commonCoach],
    $trs: {
      viewAll: 'All lessons',
    },
    computed: {
      ...mapState('classSummary', ['groupMap']),
      ...mapGetters('classSummary', [
        'learners',
        'lessons',
        'lessonLearnerStatusMap',
        'getLessonStatusCounts',
      ]),
      table() {
        const recent = orderBy(this.lessons, this.lastActivity, ['desc']).slice(0, MAX_LESSONS);
        return recent.map(lesson => {
          const assigned = this.assignedLearnerIds(lesson);
          return {
            key: lesson.id,
            name: lesson.title,
            completed: this.numCompleted(lesson.id, assigned),
            total: assigned.length,
            groups: lesson.groups.map(groupId => this.groupMap[groupId].name),
          };
        });
      },
      viewAllString() {
        return viewAllString;
      },
    },
    methods: {
      assignedLearnerIds(lesson) {
        // assigned to the whole class
        if (!lesson.groups.length) {
          return this.learners.map(learner => learner.id);
        }
        // accumulate learner IDs of groups
        const learnerIds = [];
        lesson.groups.forEach(groupId => {
          learnerIds.push(...this.groupMap[groupId].member_ids);
        });
        return learnerIds;
      },
      // return the number of learners who have completed the lesson
      numCompleted(lessonId, assignedLearnerIds) {
        return this.getLessonStatusCounts(lessonId, assignedLearnerIds)[this.STATUSES.completed];
      },
      // return the last activity among all users for a particular lesson
      lastActivity(lesson) {
        let last = null;
        if (!this.lessonLearnerStatusMap[lesson.id]) {
          return undefined;
        }
        Object.values(this.lessonLearnerStatusMap[lesson.id]).forEach(status => {
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

