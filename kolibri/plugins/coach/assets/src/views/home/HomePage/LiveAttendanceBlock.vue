<template>

  <Block
    :allLinkText="viewAllString"
    :allLinkRoute="classRoute('ReportsLessonListPage', {})"
  >
    <KLabeledIcon slot="title">
      <KIcon slot="icon" people />
      {{ coachStrings.$tr('liveAttendanceLabel') }}
    </KLabeledIcon>

    <BlockItem class="block-item">
      <ItemProgressDisplay
        :name="$tr('activeLearners')"
        :tally="liveAttendance.tally"
        :groupNames="liveAttendance.groups"
        :to="classRoute('ReportsAttendanceListPage')"
      />
    </BlockItem>
  </Block>

</template>


<script>

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import commonCoach from '../../common';
  import Block from './Block';
  import BlockItem from './BlockItem';
  import ItemProgressDisplay from './ItemProgressDisplay';
  import ActivityBlock from './ActivityBlock';

  const translator = crossComponentTranslator(ActivityBlock);

  export default {
    name: 'LiveAttendanceBlock',
    components: {
      ItemProgressDisplay,
      Block,
      BlockItem,
    },
    mixins: [commonCoach],
    $trs: {
      activeLearners: 'Active Learners',
    },
    computed: {
      liveAttendance() {
        const tallies = {
          started: this.activeLearners.length,
          notStarted: this.learners.length - this.activeLearners.length,
          completed: 0,
          helpNeeded: 0,
        };
        return {
          tally: tallies,
          groups: [],
        };
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
    },
  };

</script>


<style lang="scss" scoped></style>
