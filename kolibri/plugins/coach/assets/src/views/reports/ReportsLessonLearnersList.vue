<template>

  <CoreTable :emptyMessage="coachString('learnerListEmptyState')">
    <template #headers>
      <th>{{ coachString('nameLabel') }}</th>
      <th>{{ coreString('progressLabel') }}</th>
      <th v-if="showGroupsColumn">
        {{ coachString('groupsLabel') }}
      </th>
    </template>
    <template #tbody>
      <transition-group
        tag="tbody"
        name="list"
      >
        <tr
          v-for="tableRow in entries"
          :key="tableRow.id"
        >
          <td>
            <KRouterLink
              :text="tableRow.name"
              :to="tableRow.link"
              icon="person"
            />
          </td>
          <td>
            <StatusSimple :status="tableRow.status" />
          </td>
          <td v-if="showGroupsColumn">
            <TruncatedItemList :items="tableRow.groups" />
          </td>
        </tr>
      </transition-group>
    </template>
  </CoreTable>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../common/commonCoachStrings';
  import StatusSimple from '../common/status/StatusSimple';
  import TruncatedItemList from '../common/TruncatedItemList';

  export default {
    name: 'ReportsLessonLearnersList',
    components: {
      CoreTable,
      StatusSimple,
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
  };

</script>
