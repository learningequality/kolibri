<template>

  <div>
    <p>
      <BackLink
        :to="route(PageNames.COACH_CLASS_LIST)"
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

  import imports from '../imports';

  export default {
    name: 'OverviewBlock',
    components: {},
    mixins: [imports],
    $trs: {
      back: 'All classes',
      changeClass: 'Change class',
      coach: '{count, plural, one {Coach} other {Coaches}}',
      learner: '{count, plural, one {Learner} other {Learners}}',
    },
    computed: {
      coachNames() {
        return this.$store.state.classSummary.coaches.map(coach => coach.name);
      },
      learnerNames() {
        return this.$store.state.classSummary.learners.map(learner => learner.name);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
