<template>

  <ReportsLessonBase :showLearners="true" />

</template>


<script>

  import ReportsLessonBase from './ReportsLessonBase';

  export default {
    name: 'ReportsLessonLearnerListPage',
    components: {
      ReportsLessonBase,
    },
  };

</script>
