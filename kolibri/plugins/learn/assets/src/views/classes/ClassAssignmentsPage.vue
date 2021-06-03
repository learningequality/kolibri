<template>

  <div>
    <h1 class="classroom-name">
      <KLabeledIcon icon="classes" :label="classroomName" />
    </h1>

    <AssignedLessonsCards :items="lessons" />
    <AssignedQuizzesCards :items="exams" />

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import AssignedQuizzesCards from './AssignedQuizzesCards.vue';
  import AssignedLessonsCards from './AssignedLessonsCards.vue';

  export default {
    name: 'ClassAssignmentsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      AssignedQuizzesCards,
      AssignedLessonsCards,
    },
    data() {
      return {
        pollTimeoutId: null,
      };
    },
    computed: {
      ...mapState('classAssignments', {
        classroomName: state => state.currentClassroom.name,
        exams: state => state.currentClassroom.assignments.exams,
        lessons: state => state.currentClassroom.assignments.lessons,
      }),
    },
    mounted() {
      this.schedulePoll();
    },
    beforeDestroy() {
      clearTimeout(this.pollTimeoutId);
    },
    methods: {
      schedulePoll() {
        this.pollTimeoutId = setTimeout(this.pollForUpdates, 30000);
      },
      pollForUpdates() {
        this.$store.dispatch('classAssignments/updateWithChanges').then(() => {
          this.schedulePoll();
        });
      },
    },
    $trs: {
      documentTitle: {
        message: 'Class assignments',
        context:
          'Page/tab title displayed for the Learn page when the learner is enrolled in a class. This is where the learners can see the list of lessons and quizzes coaches have opened and made available for them.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .classroom-name {
    margin-bottom: 32px;
  }

</style>
