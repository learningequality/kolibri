<template>

  <HeaderTable v-if="avgTime || $isPrint">
    <HeaderTableRow v-if="$isPrint">
      <template #key>
        {{ coachString('classLabel') }}
      </template>
      <template #value>
        {{ className }}
      </template>
    </HeaderTableRow>
    <HeaderTableRow v-if="$isPrint">
      <template #key>
        {{ coachString('lessonLabel') }}
      </template>
      <template #value>
        {{ lessonName }}
      </template>
    </HeaderTableRow>
    <HeaderTableRow v-if="avgTime">
      <template #key>
        {{ coachString('avgTimeSpentLabel') }}
      </template>
      <template #value>
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
        default: null,
      },
      className: {
        type: String,
        default: '',
      },
      lessonName: {
        type: String,
        default: '',
      },
    },
  };

</script>
