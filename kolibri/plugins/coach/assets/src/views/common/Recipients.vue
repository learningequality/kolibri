<template>

  <span>
    <template v-if="groupNames.length">
      <TruncatedItemList :items="groupNames" />
    </template>
    <template v-else-if="hasAssignments">
      {{ $tr('assignmentClass') }}
    </template>
    <template v-else>
      {{ $tr('noOne') }}
    </template>
  </span>

</template>


<script>

  export default {
    name: 'Recipients',
    props: {
      groupNames: {
        type: Array,
        required: true,
      },
    },
    $trs: {
      assignmentClass: 'Entire class',
      noOne: 'No one',
    },
  };

</script>


<style lang="scss" scoped></style>
