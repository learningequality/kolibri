<template>

  <CoreTable :emptyMessage="coachString('activityListEmptyState')">
    <template #headers>
      <th>{{ coachString('nameLabel') }}</th>
      <th>{{ coachString('statusLabel') }}</th>
      <th>{{ coachString('timeSpentLabel') }}</th>
      <th v-if="showGroupsColumn">
        {{ coachString('groupsLabel') }}
      </th>
      <th>{{ coachString('lastActivityLabel') }}</th>
    </template>
    <template #tbody>
      <transition-group tag="tbody" name="list">
        <tr v-for="entry in entries" :key="entry.id">
          <td>
            <KLabeledIcon icon="person" :label="entry.name" />
          </td>
          <td>
            <StatusSimple :status="entry.statusObj.status" />
          </td>
          <td>
            <TimeDuration :seconds="entry.statusObj.time_spent" />
          </td>
          <td v-if="showGroupsColumn">
            <TruncatedItemList :items="getGroupNames(entry)" />
          </td>
          <td>
            <ElapsedTime :date="entry.statusObj.last_activity" />
          </td>
        </tr>
      </transition-group>
    </template>
  </CoreTable>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import { coachStringsMixin } from '../common/commonCoachStrings';
  import StatusSimple from '../common/status/StatusSimple';
  import TimeDuration from '../common/TimeDuration';
  import TruncatedItemList from '../common/TruncatedItemList';

  export default {
    name: 'ReportsResourceLearners',
    components: {
      CoreTable,
      ElapsedTime,
      StatusSimple,
      TimeDuration,
      TruncatedItemList,
    },
    mixins: [coachStringsMixin],
    props: {
      entries: {
        type: Array,
        default: () => [],
      },
      showGroupsColumn: {
        type: Boolean,
        default: true,
      },
    },
    methods: {
      getGroupNames(entry) {
        if (!entry || !entry.groups) {
          return [];
        }

        return entry.groups.map(group => group.name);
      },
    },
  };

</script>
