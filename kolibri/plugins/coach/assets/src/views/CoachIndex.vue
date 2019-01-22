<template>

  <router-view />

</template>


<script>

  export default {
    name: 'CoachIndex',
    $trs: {
      coachToolbarHeader: 'Coach',
      selectPageToolbarHeader: 'Manage resources',
      resourceUserPageToolbarHeader: 'Lesson Report Details',
      previewContentPageToolbarHeader: 'Preview resources',
      noAssignmentErrorHeader: "You aren't assigned to any classes",
      noAssignmentErrorSubheader:
        'To start coaching a class, please consult your Kolibri administrator',
      createNewExam: 'Create new quiz',
      resourcesAddedSnackbarText:
        'Added {count, number, integer} {count, plural, one {resource} other {resources}} to lesson',
      resourcesRemovedSnackbarText:
        'Removed {count, number, integer} {count, plural, one {resource} other {resources}} from lesson',
      added: "Added '{item}'",
      removed: "Removed '{item}'",
      reportLessonDetailEditorTitle: 'Edit lesson details',
      reportLessonResourceManagerTitle: 'Manage resources',
    },
    computed: {
      currentClassroomId() {
        return this.$route.params.classId;
      },
    },
    watch: {
      currentClassroomId() {},
    },
  };

</script>


<style lang="scss">

  @import '~kolibri.styles.definitions';

  // COACH - under construction ...
  .new-coach-block {
    @extend %dropshadow-1dp;

    padding: 8px 24px 24px;
    margin-top: 24px;
    background-color: white;
    border-radius: 4px;
  }

  .new-coach-table {
    width: 100%;
    min-width: 600px;
    thead {
      font-size: smaller;
      border-bottom: 1px solid rgb(223, 223, 223);
    }
    tbody tr:not(:last-child) {
      border-bottom: 1px solid rgb(223, 223, 223);
    }
    td {
      padding: 8px;
    }
  }

  .table-head {
    font-size: smaller;
    border-bottom: 1px solid rgb(223, 223, 223);
  }

  .coach-debug {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1000;
    height: 100px;
    font-weight: bold;
    text-align: center;
    background-color: white;
    border-top: 1px solid gray;

    .coach-warning {
      color: red;
    }
  }

  .new-coach-tab.router-link-active {
    border-bottom: 3px solid black;
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
  }
  // ... COACH - under construction

</style>
