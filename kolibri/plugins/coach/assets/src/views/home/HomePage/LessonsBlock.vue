<template>

  <Block
    :allLinkText="viewAllString"
    :allLinkRoute="classRoute('ReportsLessonListPage', {})"
  >
    <KLabeledIcon slot="title">
      <KIcon slot="icon" lesson />
      {{ coachStrings.$tr('lessonsLabel') }}
    </KLabeledIcon>

    <p v-if="table.length === 0">
      {{ coachStrings.$tr('lessonListEmptyState') }}
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
        :to="classRoute('ReportsLessonLearnerListPage', { lessonId: tableRow.key })"
      />
    </BlockItem>
  </Block>

</template>


<script>

  import orderBy from 'lodash/orderBy';
  import { crossComponentTranslator, localeCompare } from 'kolibri.utils.i18n';
  import commonCoach from '../../common';
  import Block from './Block';
  import BlockItem from './BlockItem';
  import ItemProgressDisplay from './ItemProgressDisplay';
  import ActivityBlock from './ActivityBlock';

  const MAX_LESSONS = 3;

  const translator = crossComponentTranslator(ActivityBlock);

  export default {
    name: 'LessonsBlock',
    components: {
      ItemProgressDisplay,
      Block,
      BlockItem,
    },
    mixins: [commonCoach],
    props: {
      showOnlyActive: Boolean,
    },
    $trs: {
      viewAll: 'All lessons',
    },
    computed: {
      table() {
        const recent = orderBy(this.lessons, this.lastActivity, ['desc']).slice(0, MAX_LESSONS);
        return recent.map(lesson => {
          let assigned = this.getLearnersForGroups(lesson.groups);
          if (this.showOnlyActive) {
            assigned = this.filterByActive(assigned);
          }
          return {
            key: lesson.id,
            name: lesson.title,
            tally: this.getLessonStatusTally(lesson.id, assigned),
            groups: lesson.groups.map(groupId => this.groupMap[groupId].name),
          };
        });
      },
      viewAllString() {
        return translator.$tr('viewAll');
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
      active(learner) {
        return this.activeLearners.includes(learner);
      },
      filterByActive(learners) {
        const sortByKey = 'username';
        const predicate = learner => this.active(learner);
        return learners.filter(predicate).sort((a, b) => {
          return localeCompare(a[sortByKey], b[sortByKey]);
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
