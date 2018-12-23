<template>

  <div>
    <p>
      <BackLink
        :to="newCoachRoute('ClassListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>Class name</h1>
    <ul>
      <li>{{ $tr('coach', {count: 2}) }} A | B | C</li>
      <li>{{ $tr('learner', {count: 12}) }} 21</li>
    </ul>
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
      coachCount: '{count, number, integer} {count, plural, one {Coach} other {Coaches}}',
      coach: '{count, plural, one {Coach} other {Coaches}}',
      learnerCount: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      learner: '{count, plural, one {Learner} other {Learners}}',
    },
  };

</script>


<style lang="scss" scoped></style>
