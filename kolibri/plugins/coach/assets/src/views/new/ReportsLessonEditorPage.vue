<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <LessonDetailEditor />
      <p><KButton :text="coachStrings.$tr('manageResourcesAction')" /></p>
      <h2>{{ coachStrings.$tr('numberOfResources', { value: 2 }) }}</h2>
      <pre>ResourceListTable</pre>
      <KButton :text="coachStrings.$tr('cancelAction')" :primary="false" />
      <KButton :text="coachStrings.$tr('saveAction')" :primary="true" />
    </div>
  </CoreBase>

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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
