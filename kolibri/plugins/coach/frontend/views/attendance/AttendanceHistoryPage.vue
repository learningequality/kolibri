<template>

  <div>
    <h1>{{ title$() }}</h1>
  </div>

</template>


<script>

  import { createTranslator } from 'kolibri/utils/i18n';

  const strings = createTranslator('AttendanceHistoryPage', {
    title: {
      message: 'Attendance History',
      context: 'Page heading for viewing attendance history',
    },
  });

  export default {
    name: 'AttendanceHistoryPage',
    setup() {
      const { title$ } = strings;
      return { title$ };
    },
  };

</script>
