<template>

  <HeaderTable v-if="avgTime">
    <HeaderTableRow>
      <template slot="key">
        {{ common$tr('avgTimeSpentLabel') }}
      </template>
      <template slot="value">
        <TimeDuration :seconds="avgTime" />
      </template>
    </HeaderTableRow>
  </HeaderTable>

</template>


<script>

  import { coachStringsMixin } from '../common/commonCoachStrings';
  import HeaderTable from '../common/HeaderTable';
  import HeaderTableRow from '../common/HeaderTable/HeaderTableRow';
  import TimeDuration from '../common/TimeDuration';

  export default {
    name: 'ReportsResourcesStats',
    components: {
      HeaderTable,
      HeaderTableRow,
      TimeDuration,
    },
    mixins: [coachStringsMixin],
    props: {
      avgTime: {
        type: Number,
      },
    },
  };

</script>
