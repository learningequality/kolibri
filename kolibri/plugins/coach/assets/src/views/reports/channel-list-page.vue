<template>

  <div>
    <div v-if="showRecentOnly" class="header">
      <h1>{{ $tr('recentTitle') }}</h1>
      <report-subheading />
    </div>

    <report-table v-if="standardDataTable.length" :caption="$tr('channelList')">
      <thead slot="thead">
        <tr>
          <header-cell
            :text="$tr('channels')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.NAME" />
          <header-cell
            :text="$tr('lastActivity')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.DATE" />
        </tr>
      </thead>
      <tbody slot="tbody">
        <template v-for="channel in standardDataTable">
          <tr :key="channel.id">
            <name-cell
              :kind="CHANNEL"
              :title="channel.title"
              :link="reportLink(channel.id)"
              :key="channel.id"
            />
            <activity-cell
              :date="channel.lastActive"
              :key="channel.id"
            />
          </tr>
        </template>
      </tbody>
    </report-table>
  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { getChannels } from 'kolibri.coreVue.vuex.getters';
  import { PageNames } from '../../constants';
  import * as reportConstants from '../../reportConstants';
  import * as reportGetters from '../../state/getters/reports';
  import reportTable from './report-table';
  import reportSubheading from './report-subheading';
  import headerCell from './table-cells/header-cell';
  import nameCell from './table-cells/name-cell';
  import activityCell from './table-cells/activity-cell';
  import alignMixin from './align-mixin';
  export default {
    name: 'coachRecentPageChannelList',
    components: {
      reportTable,
      reportSubheading,
      headerCell,
      nameCell,
      activityCell,
    },
    mixins: [alignMixin],
    $trs: {
      recentTitle: 'Recent Activity',
      channels: 'Channels',
      channelList: 'Channel list',
      lastActivity: 'Last active',
    },
    computed: {
      CHANNEL() {
        return ContentNodeKinds.CHANNEL;
      },
      tableColumns() {
        return reportConstants.TableColumns;
      },
    },
    methods: {
      reportLink(channelId) {
        const linkTargets = {
          [PageNames.RECENT_CHANNELS]: PageNames.RECENT_ITEMS_FOR_CHANNEL,
          [PageNames.TOPIC_CHANNELS]: PageNames.TOPIC_CHANNEL_ROOT,
          [PageNames.LEARNER_CHANNELS]: PageNames.LEARNER_CHANNEL_ROOT,
        };
        return {
          name: linkTargets[this.pageName],
          params: {
            classId: this.classId,
            channelId,
          },
        };
      },
    },
    vuex: {
      getters: {
        channels: getChannels,
        standardDataTable: reportGetters.standardDataTable,
        classId: state => state.classId,
        pageName: state => state.pageName,
        showRecentOnly: state => state.pageState.showRecentOnly,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
