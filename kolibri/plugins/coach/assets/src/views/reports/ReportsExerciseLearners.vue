<template>

  <CoreTable :emptyMessage="coachString('activityListEmptyState')">
    <template #headers>
      <th>{{ coachString('nameLabel') }}</th>
      <th>{{ coreString('progressLabel') }}</th>
      <th>{{ coachString('timeSpentLabel') }}</th>
      <th v-if="showGroupsColumn">
        {{ coachString('groupsLabel') }}
      </th>
      <th>{{ coachString('lastActivityLabel') }}</th>
    </template>
    <template #tbody>
      <transition-group tag="tbody" name="list">
        <tr v-for="entry in entries" :key="entry.id" data-test="entry">
          <td>
            <KRouterLink
              v-if="showLink(entry)"
              :text="entry.name"
              :to="entry.exerciseLearnerLink"
              data-test="exercise-learner-link"
              icon="person"
            />
            <KLabeledIcon v-else :label="entry.name" icon="person" />
          </td>
          <td>
            <StatusSimple :status="entry.statusObj.status" />
          </td>
          <td>
            <TimeDuration
              :seconds="timeDuration(entry)"
            />
          </td>
          <td v-if="showGroupsColumn">
            <TruncatedItemList :items="getGroupNames(entry)" />
          </td>
          <td>
            <ElapsedTime
              :date="elapsedTime(entry)"
            />
          </td>
        </tr>
      </transition-group>
    </template>
  </CoreTable>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../common/commonCoachStrings';
  import StatusSimple from '../common/status/StatusSimple';
  import TimeDuration from '../common/TimeDuration';
  import TruncatedItemList from '../common/TruncatedItemList';
  import { STATUSES } from '../../modules/classSummary/constants';

  export default {
    name: 'ReportsExerciseLearners',
    components: {
      CoreTable,
      ElapsedTime,
      StatusSimple,
      TimeDuration,
      TruncatedItemList,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
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
    data() {
      return {
        STATUSES,
      };
    },
    methods: {
      showLink(entry) {
        return entry.statusObj.status !== this.STATUSES.notStarted;
      },
      timeDuration(entry) {
        if (entry.statusObj.status !== this.STATUSES.notStarted) {
          return entry.statusObj.time_spent;
        }

        return null;
      },
      elapsedTime(entry) {
        if (entry.statusObj.status !== this.STATUSES.notStarted) {
          return entry.statusObj.last_activity;
        }

        return null;
      },
      getGroupNames(entry) {
        if (!entry || !entry.groups) {
          return [];
        }

        return entry.groups.map(group => group.name);
      },
    },
  };

</script>
