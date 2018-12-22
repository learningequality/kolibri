<template>

  <div class="new-coach-block">
    <QuizDetailEditor />
    <KButton :text="$tr('cancel')" :primary="false" />
    <KButton :text="$tr('save')" :primary="true" />
  </div>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import QuizDetailEditor from './shared/QuizDetailEditor';

  export default {
    name: 'ReportsQuizEditorPage',
    components: {
      KButton,
      QuizDetailEditor,
    },
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
