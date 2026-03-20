<template>

  <router-view />

</template>


<script>

  import usePreviousRoute from 'kolibri-common/composables/usePreviousRoute';

  export default {
    name: 'CourseRootPage',
    setup() {
      usePreviousRoute();
    },
  };

</script>
