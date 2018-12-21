<template>

  <span>
    <template v-if="!groups.length">
      -
    </template>
    <template v-else-if="groups.length === 1">
      {{ groups[0] }}
    </template>
    <template v-else-if="groups.length === 2">
      {{ $tr('twoGroups', {group1: groups[0], group2: groups[1]}) }}
    </template>
    <template v-else-if="groups.length === 3">
      {{ $tr('threeGroups', {group1: groups[0], group2: groups[1], group3: groups[2]}) }}
    </template>
    <template v-else>
      {{ $tr('manyGroups', {group1: groups[0], group2: groups[1], count: groups.length-2}) }}
    </template>
  </span>

</template>


<script>

  export default {
    name: 'EnrolledGroups',
    components: {},
    props: {
      groups: {
        type: Array,
        required: true,
      },
    },
    $trs: {
      twoGroups: '{group1}, {group2}',
      threeGroups: '{group1}, {group2}, {group3}',
      manyGroups: '{group1}, {group2}, and {count, number, integer} others',
    },
  };

</script>


<style lang="scss" scoped></style>
