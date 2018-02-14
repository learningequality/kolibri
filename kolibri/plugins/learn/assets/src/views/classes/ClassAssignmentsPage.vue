<template>

  <div>
    <h1 class="classroom-name">
      {{ currentClassroom.name }}
    </h1>
    <assigned-exams-table class="exams-table" :exams="exams" />

    <assigned-lessons-cards
      :lessons="lessons"
      :isMobile="isMobile"
    />
    <pre>
      {{ JSON.stringify(currentClassroom, null, 2) }}
    </pre>
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import AssignedExamsTable from './AssignedExamsTable';
  import AssignedLessonsCards from './AssignedLessonsCards';

  export default {
    components: {
      AssignedExamsTable,
      AssignedLessonsCards,
    },
    mixins: [responsiveWindow],
    computed: {
      isMobile() {
        return this.windowSize.breakpoint <= 1;
      },
    },
    vuex: {
      getters: {
        currentClassroom: state => state.pageState.currentClassroom,
        exams: state => state.pageState.currentClassroom.assignments.exams,
        lessons: state => state.pageState.currentClassroom.assignments.lessons,
      },
    },
    $trs: {},
  };

</script>


<style lang="stylus" scoped>

  .classroom-name
    margin-bottom: 32px

  .exams-table
    margin-bottom: 120px

</style>
