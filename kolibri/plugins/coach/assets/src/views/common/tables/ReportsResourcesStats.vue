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

  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import { coachStringsMixin } from '../commonCoachStrings';
  import HeaderTable from '../HeaderTable';
  import HeaderTableRow from '../HeaderTable/HeaderTableRow';

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
