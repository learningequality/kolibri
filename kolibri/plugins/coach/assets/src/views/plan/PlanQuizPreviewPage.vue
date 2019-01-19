<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    TODO
  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from '../common';

  export default {
    name: 'PlanQuizPreviewPage',
    components: {},
    mixins: [commonCoach],
    $trs: {},
    computed: {
      ...mapState('examCreation', ['preview', 'selectedExercises', 'currentContentNode']),
      isSelected() {
        return (
          this.selectedExercises.findIndex(
            exercise => exercise.id === this.currentContentNode.id
          ) !== -1
        );
      },
    },
  };

</script>


<style lang="scss" scoped></style>
