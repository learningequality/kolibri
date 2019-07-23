<template>

  <span>
    <template v-if="groupNames.length">
      <TruncatedItemList :items="groupNames" />
    </template>
    <template v-else-if="hasAssignments">
      {{ coachString('entireClassLabel') }}
    </template>
    <template v-else>
      {{ $tr('noOne') }}
    </template>
  </span>

</template>


<script>

  import TruncatedItemList from './TruncatedItemList';
  import { coachStringsMixin } from './commonCoachStrings';

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
      noOne: 'No one',
    },
  };

</script>


<style lang="scss" scoped></style>
