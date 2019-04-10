<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <LessonDetailEditor />
      <p><KButton :text="coachStrings.$tr('manageResourcesAction')" /></p>
      <h2>{{ coachStrings.$tr('numberOfResources', { value: 2 }) }}</h2>
      <pre>ResourceListTable</pre>
      <KButton :text="coachStrings.$tr('cancelAction')" :primary="false" />
      <KButton :text="coachStrings.$tr('saveAction')" :primary="true" />
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import LessonDetailEditor from '../common/LessonDetailEditor';

  export default {
    name: 'ReportsLessonEditorPage',
    components: {
      LessonDetailEditor,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
