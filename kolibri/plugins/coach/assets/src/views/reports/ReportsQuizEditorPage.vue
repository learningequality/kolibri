<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <QuizDetailEditor />
      <KButton :text="coachStrings.$tr('cancelAction')" :primary="false" />
      <KButton :text="coachStrings.$tr('saveAction')" :primary="true" />
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import QuizDetailEditor from '../common/QuizDetailEditor';

  export default {
    name: 'ReportsQuizEditorPage',
    components: {
      QuizDetailEditor,
    },
    mixins: [commonCoach],
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
