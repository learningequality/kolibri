<template>

  <div>
    <h1 class="classroom-name">
      {{ currentClassroom.name }}
    </h1>
    <assigned-exams-table class="exams-table" :exams="exams" />
    <pre>
      {{ JSON.stringify(currentClassroom, null, 2) }}
    </pre>
  </div>

</template>


<script>

  import AssignedExamsTable from './AssignedExamsTable';

  export default {
    components: {
      AssignedExamsTable,
    },
    computed: {},
    methods: {},
    vuex: {
      getters: {
        currentClassroom: state => state.pageState.currentClassroom,
        exams: state => state.pageState.currentClassroom.assignments.exams,
      },
      actions: {},
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
