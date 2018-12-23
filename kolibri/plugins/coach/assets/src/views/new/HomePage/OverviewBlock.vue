<template>

  <div>
    <p>
      <BackLink
        :to="newCoachRoute('ClassListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>Class name</h1>
    <dl>
      <dd>{{ $tr('coach', {count: 2}) }}</dd>
      <dt><TruncatedItemList :items="['a', 'b', 'c', 'd']" /></dt>
      <dd>{{ $tr('learner', {count: 12}) }}</dd>
      <dt>{{ coachStrings.$tr('integer', {value: 12}) }}</dt>
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
  };

</script>


<style lang="scss" scoped></style>
