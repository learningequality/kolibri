<template>

  <HeaderTable v-if="avgTime || $isPrint">
    <HeaderTableRow v-if="$isPrint">
      <template v-slot:key>
        {{ coachString('classLabel') }}
      </template>
      <template v-slot:value>
        {{ className }}
      </template>
    </HeaderTableRow>
    <HeaderTableRow v-if="$isPrint">
      <template v-slot:key>
        {{ coachString('lessonLabel') }}
      </template>
      <template v-slot:value>
        {{ lessonName }}
      </template>
    </HeaderTableRow>
    <HeaderTableRow v-if="avgTime">
      <template v-slot:key>
        {{ coachString('avgTimeSpentLabel') }}
      </template>
      <template v-slot:value>
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
      className: {
        type: String,
      },
      lessonName: {
        type: String,
      },
    },
  };

</script>
