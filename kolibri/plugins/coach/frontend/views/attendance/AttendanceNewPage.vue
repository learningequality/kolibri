<template>

  <div>
    <h1>{{ title$() }}</h1>
  </div>

</template>


<script>

  import { createTranslator } from 'kolibri/utils/i18n';

  const strings = createTranslator('AttendanceNewPage', {
    title: {
      message: 'Mark Attendance',
      context: 'Page heading for taking new attendance',
    },
  });

  export default {
    name: 'AttendanceNewPage',
    setup() {
      const { title$ } = strings;
      return { title$ };
    },
  };

</script>
