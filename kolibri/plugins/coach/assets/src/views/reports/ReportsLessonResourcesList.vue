<template>

  <CoreTable :emptyMessage="coachString('noResourcesInLessonLabel')">
    <template #headers>
      <th>{{ coachString('titleLabel') }}</th>
      <th>{{ coreString('progressLabel') }}</th>
      <th>{{ coachString('avgTimeSpentLabel') }}</th>
    </template>
    <template #tbody>
      <transition-group
        tag="tbody"
        name="list"
      >
        <tr
          v-for="tableRow in entries"
          :key="tableRow.node_id"
        >
          <td>
            <KLabeledIcon :icon="tableRow.kind">
              <KRouterLink
                v-if="tableRow.link"
                :text="tableRow.title"
                :to="tableRow.link"
              />
              <template v-else>
                {{ tableRow.title }}
              </template>
            </KLabeledIcon>
          </td>
          <td>
            <StatusSummary
              v-if="tableRow.tally"
              :tally="tableRow.tally"
              :verbose="true"
            />
            <KEmptyPlaceholder v-else />
          </td>
          <td>
            <TimeDuration
              v-if="tableRow.tally"
              :seconds="tableRow.avgTimeSpent"
            />
            <KEmptyPlaceholder v-else />
          </td>
        </tr>
      </transition-group>
    </template>
  </CoreTable>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../common/commonCoachStrings';
  import StatusSummary from '../common/status/StatusSummary';

  export default {
    name: 'ReportsLessonResourcesList',
    components: {
      CoreTable,
      StatusSummary,
      TimeDuration,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      entries: {
        type: Array,
        default: () => [],
      },
    },
  };

</script>
