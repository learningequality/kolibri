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
  import imports from './imports';

  export default {
    name: 'PlanQuizPreviewPage',
    components: {},
    mixins: [imports],
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
