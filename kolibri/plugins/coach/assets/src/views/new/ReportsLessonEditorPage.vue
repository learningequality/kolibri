<template>

  <div class="new-coach-block">
    <LessonDetailEditor />
    <p><KButton :text="$tr('manageResources')" /></p>
    <h2>{{ $tr('numResources', { count: 2 }) }}</h2>
    <pre>ResourceListTable</pre>
    <KButton :text="$tr('cancel')" :primary="false" />
    <KButton :text="$tr('save')" :primary="true" />
  </div>

</template>


<script>

  import imports from './imports';
  import LessonDetailEditor from './shared/LessonDetailEditor';

  export default {
    name: 'ReportsLessonEditorPage',
    components: {
      LessonDetailEditor,
    },
    mixins: [imports],
    data() {
      return {
        lessonTitle: 'Lesson A',
        lessonDescription: 'Ipsum lorem',
        selectedCollectionIds: ['a'],
        availableGroups: [{ name: 'Group A', id: 'a' }, { name: 'Group B', id: 'b' }],
        selectedClassroomId: 'x',
        isActive: true,
      };
    },
    $trs: {
      manageResources: 'Manage resources',
      cancel: 'Cancel',
      save: 'Save',
      numResources: '{count, number, integer} {count, plural, one {resource} other {resources}}',
    },
  };

</script>


<style lang="scss" scoped></style>
