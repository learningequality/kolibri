<template>

  <div>

    <breadcrumbs />
    <template v-if="showRecentOnly">
      <h1>{{ $tr('recentTitle') }}</h1>
      <p v-if="standardDataTable.length">{{ $tr('showingRecent', { threshold }) }}</p>
    </template>
    <template v-else>
      <h1>{{ $tr('topicsTitle') }}</h1>
    </template>
    <core-table :caption="$tr('channelList')">
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <header-cell
            :text="$tr('channels')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.NAME"
          />
          <header-cell
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
            <content-icon :kind="CHANNEL" />
          </td>
          <name-cell
            :kind="CHANNEL"
            :title="channel.title"
            :link="reportLink(channel.id)"
            :numCoachContents="channel.num_coach_contents"
          />
          <activity-cell :date="channel.lastActive" />
        </tr>
      </tbody>
    </core-table>

    <template v-if="!standardDataTable.length">
      <p v-if="showRecentOnly">{{ $tr('noRecent', { threshold }) }}</p>
      <p v-else>{{ $tr('noChannels') }}</p>
    </template>

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import coreTable from 'kolibri.coreVue.components.coreTable';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { standardDataTable } from '../../state/getters/reports';
  import { PageNames } from '../../constants';
  import { TableColumns, RECENCY_THRESHOLD_IN_DAYS } from '../../constants/reportConstants';
  import headerCell from './table-cells/header-cell';
  import nameCell from './table-cells/name-cell';
  import activityCell from './table-cells/activity-cell';
  import alignMixin from './align-mixin';
  import breadcrumbs from './breadcrumbs';

  export default {
    name: 'channelListPage',
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
    components: {
      breadcrumbs,
      contentIcon,
      coreTable,
      headerCell,
      nameCell,
      activityCell,
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
      ...mapState(['classId', 'pageName']),
      ...mapState({
        standardDataTable,
        showRecentOnly: state => state.pageState.showRecentOnly,
      }),
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
  };

</script>


<style lang="scss" scoped></style>
