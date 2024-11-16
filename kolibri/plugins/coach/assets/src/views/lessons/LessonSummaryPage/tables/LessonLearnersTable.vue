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

  import { mapState } from 'vuex';
  import CoreTable from 'kolibri/components/CoreTable';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import CSVExporter from '../../../../csv/exporter';
  import * as csvFields from '../../../../csv/fields';
  import StatusSimple from '../../../common/status/StatusSimple';
  import TruncatedItemList from '../../../common/TruncatedItemList';
  import { coachStringsMixin } from '../../../common/commonCoachStrings';

  export default {
    name: 'LessonLearnersTable',
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
      title: {
        type: String,
        default: '',
      },
    },
    computed: {
      ...mapState('classSummary', { className: 'name' }),
    },
    methods: {
      /**
       * @public
       */
      exportCSV() {
        const columns = [
          ...csvFields.name(),
          ...csvFields.learnerProgress(),
          ...csvFields.list('groups', 'groupsLabel'),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          lesson: this.title,
          learners: this.coachString('learnersLabel'),
        });
        exporter.export(this.entries);
      },
    },
  };

</script>
