<template>

  <div class="new-coach-block">
    <p><BackLink :to="{ name:'CLASS_LIST' }" :text="$tr('back')" /></p>
    <h1>Class name</h1>
    <ul>
      <li>{{ $tr('coach', {count: 2}) }} A | B | C</li>
      <li>{{ $tr('learner', {count: 12}) }} 21</li>
    </ul>
  </div>

</template>


<script>

  import BackLink from '../BackLink';

  export default {
    name: 'OverviewBlock',
    components: {
      BackLink,
    },
    $trs: {
      back: 'View all classes',
      changeClass: 'Change class',
      coachCount: '{count, number, integer} {count, plural, one {Coach} other {Coaches}}',
      coach: '{count, plural, one {Coach} other {Coaches}}',
      learnerCount: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      learner: '{count, plural, one {Learner} other {Learners}}',
    },
  };

</script>


<style lang="scss" scoped></style>
