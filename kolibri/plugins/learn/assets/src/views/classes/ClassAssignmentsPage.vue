<template>

  <div>
    <h1 dir="auto" class="classroom-name">
      {{ classroomName }}
    </h1>

    <AssignedExamsCards
      :exams="exams"
      :isMobile="windowIsSmall"
    />
    <AssignedLessonsCards
      :lessons="lessons"
      :isMobile="windowIsSmall"
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
      ...mapState('classAssignments', {
        classroomName: state => state.currentClassroom.name,
        exams: state => state.currentClassroom.assignments.exams,
        lessons: state => state.currentClassroom.assignments.lessons,
      }),
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
