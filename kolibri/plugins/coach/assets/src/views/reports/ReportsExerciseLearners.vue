<template>

  <CoreTable :emptyMessage="coachCommon$tr('activityListEmptyState')">
    <thead slot="thead">
      <tr>
        <th>{{ coachCommon$tr('nameLabel') }}</th>
        <th>{{ coachCommon$tr('progressLabel') }}</th>
        <th>{{ coachCommon$tr('timeSpentLabel') }}</th>
        <th v-if="showGroupsColumn">
          {{ coachCommon$tr('groupsLabel') }}
        </th>
        <th>{{ coachCommon$tr('lastActivityLabel') }}</th>
      </tr>
    </thead>
    <transition-group slot="tbody" tag="tbody" name="list">
      <tr v-for="entry in entries" :key="entry.id" data-test="entry">
        <td>
          <KRouterLink
            v-if="showLink(entry)"
            :text="entry.name"
            :to="entry.exerciseLearnerLink"
          />
          <template v-else>
            {{ entry.name }}
          </template>
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
  </CoreTable>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';

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
      KRouterLink,
      StatusSimple,
      TimeDuration,
      TruncatedItemList,
    },
    mixins: [coachStringsMixin],
    props: {
      entries: {
        type: Array,
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
