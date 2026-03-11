<template>

  <div>
    <h1>{{ title$() }}</h1>
  </div>

</template>


<script>

  import { createTranslator } from 'kolibri/utils/i18n';

  const strings = createTranslator('AttendanceEditPage', {
    title: {
      message: 'Edit Attendance',
      context: 'Page heading for editing an attendance record',
    },
  });

  export default {
    name: 'AttendanceEditPage',
    setup() {
      const { title$ } = strings;
      return { title$ };
    },
  };

</script>
