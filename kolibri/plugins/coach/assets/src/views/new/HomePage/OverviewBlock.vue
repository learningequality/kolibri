<template>

  <div>
    <p>
      <BackLink
        :to="route(PageNames.COACH_CLASS_LIST)"
        :text="$tr('back')"
      />
    </p>
    <h1>Class name</h1>
    <dl>
      <dt>{{ $tr('coach', {count: 2}) }}</dt>
      <dd><TruncatedItemList :items="['a', 'b', 'c', 'd']" /></dd>
      <dt>{{ $tr('learner', {count: 12}) }}</dt>
      <dd>{{ coachStrings.$tr('integer', {value: 12}) }}</dd>
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
