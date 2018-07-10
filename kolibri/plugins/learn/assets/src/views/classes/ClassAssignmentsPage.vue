<template>

  <div>
    <h1 class="classroom-name">
      {{ classroomName }}
    </h1>

    <assigned-exams-cards
      :exams="exams"
      :isMobile="isMobile"
    />
    <assigned-lessons-cards
      :lessons="lessons"
      :isMobile="isMobile"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import AssignedExamsCards from './AssignedExamsCards';
  import AssignedLessonsCards from './AssignedLessonsCards';

  export default {
    name: 'ClassAssignmentsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      AssignedExamsCards,
      AssignedLessonsCards,
    },
    mixins: [responsiveWindow],
    computed: {
      ...mapState({
        classroomName: state => state.pageState.currentClassroom.name,
        exams: state => state.pageState.currentClassroom.assignments.exams,
        lessons: state => state.pageState.currentClassroom.assignments.lessons,
      }),
      isMobile() {
        return this.windowSize.breakpoint <= 1;
      },
    },
    $trs: {
      documentTitle: 'Class assignments',
    },
  };

</script>


<style lang="scss" scoped>

  .classroom-name {
    margin-bottom: 32px;
  }

</style>
