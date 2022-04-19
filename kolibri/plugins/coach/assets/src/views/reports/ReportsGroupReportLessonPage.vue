<template>

  <ReportsLessonBase :showResources="true" />

</template>


<script>

  import ReportsLessonBase from './ReportsLessonBase';

  export default {
    name: 'ReportsGroupReportLessonPage',
    components: {
      ReportsLessonBase,
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

</style>
