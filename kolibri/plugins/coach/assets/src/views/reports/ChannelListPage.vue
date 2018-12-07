<template>

  <div>

    <Breadcrumbs />
    <template v-if="showRecentOnly">
      <h1>{{ $tr('recentTitle') }}</h1>
      <p v-if="standardDataTable.length">{{ $tr('showingRecent', { threshold }) }}</p>
    </template>
    <template v-else>
      <h1>{{ $tr('channels') }}</h1>
    </template>
    <CoreTable :caption="$tr('channelList')">
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <HeaderCell
            :text="$tr('channels')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.NAME"
          />
          <HeaderCell
            :text="$tr('lastActivity')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.DATE"
          />
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr v-for="channel in standardDataTable" :key="channel.id">
          <td class="core-table-icon-col">
            <ContentIcon :kind="CHANNEL" />
          </td>
          <NameCell
            :kind="CHANNEL"
            :title="channel.title"
            :link="reportLink(channel.id)"
            :numCoachContents="channel.num_coach_contents"
          />
          <ActivityCell :date="channel.lastActive" />
        </tr>
      </tbody>
    </CoreTable>

    <template v-if="!standardDataTable.length">
      <p v-if="showRecentOnly">{{ $tr('noRecent', { threshold }) }}</p>
      <p v-else>{{ $tr('noChannels') }}</p>
    </template>

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../../constants';
  import { TableColumns, RECENCY_THRESHOLD_IN_DAYS } from '../../constants/reportConstants';
  import HeaderCell from './table-cells/HeaderCell';
  import NameCell from './table-cells/NameCell';
  import ActivityCell from './table-cells/ActivityCell';
  import alignMixin from './align-mixin';
  import Breadcrumbs from './Breadcrumbs';

  export default {
    name: 'ChannelListPage',
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
    components: {
      Breadcrumbs,
      ContentIcon,
      CoreTable,
      HeaderCell,
      NameCell,
      ActivityCell,
    },
    mixins: [alignMixin],
    $trs: {
      recentTitle: 'Recent activity',
      topicsTitle: 'Content',
      channels: 'Channels',
      channelList: 'Channel list',
      lastActivity: 'Last active',
      showingRecent: 'Showing activity in past {threshold} days',
      noRecent: 'There has been no activity in the past {threshold} days',
      noChannels: 'You do not have any content yet',
      documentTitleForRecentChannels: 'Recent - All channels',
      documentTitleForTopicChannels: 'Topics - All channels',
      documentTitleForLearnerChannels: 'Learners - All channels',
    },
    computed: {
      ...mapGetters('reports', ['standardDataTable']),
      ...mapState('reports', ['showRecentOnly', 'userScope', 'userScopeId']),
      ...mapState(['classId', 'pageName', 'reportRefreshInterval']),
      ...mapGetters({
        channels: 'getChannels',
      }),
      documentTitle() {
        switch (this.pageName) {
          case PageNames.LEARNER_CHANNELS:
            return this.$tr('documentTitleForLearnerChannels');
          case PageNames.RECENT_CHANNELS:
            return this.$tr('documentTitleForRecentChannels');
          case PageNames.TOPIC_CHANNELS:
            return this.$tr('documentTitleForTopicChannels');
        }
      },
      CHANNEL() {
        return ContentNodeKinds.CHANNEL;
      },
      tableColumns() {
        return TableColumns;
      },
      threshold() {
        return RECENCY_THRESHOLD_IN_DAYS;
      },
    },
    mounted() {
      this.intervalId = setInterval(this.refreshReportData, this.reportRefreshInterval);
    },
    beforeDestroy() {
      this.intervalId = clearInterval(this.intervalId);
    },
    methods: {
      refreshReportData() {
        // The data needed to do a proper refresh. See _showChannelList for details
        return this.$store.dispatch('reports/setChannelsTableData', {
          channels: this.channels,
          collectionKind: this.userScope,
          collectionId: this.userScopeId,
          isSamePage: samePageCheckGenerator(this.$store),
        });
      },
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
  };

</script>


<style lang="scss" scoped></style>
