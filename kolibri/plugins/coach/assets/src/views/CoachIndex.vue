<template>

  <router-view />

</template>


<script>

  export default {
    name: 'CoachIndex',
    $trs: {
      coachToolbarHeader: 'Coach',
      selectPageToolbarHeader: 'Manage resources',
      previewContentPageToolbarHeader: 'Preview resources',
      noAssignmentErrorHeader: "You aren't assigned to any classes",
      noAssignmentErrorSubheader:
        'To start coaching a class, please consult your Kolibri administrator',
      createNewExam: 'Create new quiz',
      added: "Added '{item}'",
      removed: "Removed '{item}'",
      reportLessonResourceManagerTitle: 'Manage resources',
    },
  };

</script>


<style lang="scss"></style>
