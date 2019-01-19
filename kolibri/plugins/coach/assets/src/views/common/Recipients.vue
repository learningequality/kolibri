<template>

  <span>
    <template v-if="!groups.length">
      {{ $tr('assignmentClass') }}
    </template>
    <template v-else>
      <TruncatedItemList :items="groups" />
    </template>
  </span>

</template>


<script>

  import TruncatedItemList from './TruncatedItemList';
  import { coachStringsMixin } from './commonCoachStrings.js';

  export default {
    name: 'Recipients',
    components: {
      TruncatedItemList,
    },
    mixins: [coachStringsMixin],
    props: {
      groups: {
        type: Array,
        required: true,
      },
    },
    $trs: {
      assignmentClass: 'Entire class',
    },
  };

</script>


<style lang="scss" scoped></style>
