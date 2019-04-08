<template>

  <CoreBase
    :immersivePage="false"
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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
