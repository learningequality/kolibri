<template>

  <div>
    <p>
      <BackLink
        :to="$router.getRoute('CoachClassListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>{{ $store.state.classSummary.name }}</h1>
    <dl>
      <dt>{{ $tr('coach', {count: coachNames.length}) }}</dt>
      <dd><TruncatedItemList :items="coachNames" /></dd>
      <dt>{{ $tr('learner', {count: learnerNames.length}) }}</dt>
      <dd>{{ coachStrings.$tr('integer', {value: learnerNames.length}) }}</dd>
    </dl>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoach from '../../common';

  export default {
    name: 'OverviewBlock',
    components: {},
    mixins: [commonCoach],
    $trs: {
      back: 'All classes',
      changeClass: 'Change class',
      coach: '{count, plural, one {Coach} other {Coaches}}',
      learner: '{count, plural, one {Learner} other {Learners}}',
    },
    computed: {
      ...mapGetters('classSummary', ['coaches', 'learners']),
      coachNames() {
        return this.coaches.map(coach => coach.name);
      },
      learnerNames() {
        return this.learners.map(learner => learner.name);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
