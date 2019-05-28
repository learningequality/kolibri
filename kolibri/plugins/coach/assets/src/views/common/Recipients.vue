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

  import AssignmentSummary from '../plan/assignments/AssignmentSummary';
  import TruncatedItemList from './TruncatedItemList';
  import { coachStringsMixin } from './commonCoachStrings.js';

  const assignmentSummaryStrings = crossComponentTranslator(AssignmentSummary);

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
      hasAssignments: {
        type: Boolean,
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
