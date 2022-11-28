<template>

  <CoachAppBarPage
    :appBarTitle="coreString('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <KPageContainer>
      <PlanHeader />
      Learner list
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CoachAppBarPage from '../CoachAppBarPage';
  import PlanHeader from './PlanHeader';

  export default {
    name: 'PlanLearnerListPage',
    components: {
      CoachAppBarPage,
      PlanHeader,
    },
    mixins: [commonCoreStrings],
  };

</script>


<style lang="scss" scoped></style>
