<template>

  <span>
    <template v-if="!groupNames.length">
      {{ $tr('assignmentClass') }}
    </template>
    <template v-else>
      <TruncatedItemList :items="groupNames" />
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
      groupNames: {
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
