<template>

  <div>

    <breadcrumbs />
    <h1>{{ $tr('title') }}</h1>

    <core-table>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <header-cell
            :text="$tr('name')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.NAME"
          />
          <header-cell
            :text="$tr('progress')"
            :sortable="true"
            :column="tableColumns.CONTENT"
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
        <tr v-for="row in standardDataTable" :key="row.id">
          <td class="core-table-icon-col">
            <content-icon :kind="row.kind" />
          </td>
          <name-cell
            :kind="row.kind"
            :title="row.title"
            :link="genLink(row)"
            :numCoachContents="row.num_coach_contents"
          />
          <td>
            <progress-bar :showPercentage="false" :progress="row.contentProgress" />
            {{ progressString(row) }}
          </td>
          <activity-cell :date="row.lastActive" />
        </tr>
      </tbody>
    </core-table>

    <p v-if="!standardDataTable.length">
      {{ noProgressText }}
    </p>

  </div>

</template>


<script>

  import coreTable from 'kolibri.coreVue.components.coreTable';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import { PageNames } from '../../constants';
  import { TableColumns, RECENCY_THRESHOLD_IN_DAYS } from '../../constants/reportConstants';
  import { classMemberCount } from '../../state/getters/classes';
  import * as reportGetters from '../../state/getters/reports';
  import breadcrumbs from './breadcrumbs';
  import headerCell from './table-cells/header-cell';
  import nameCell from './table-cells/name-cell';
  import activityCell from './table-cells/activity-cell';
  import alignMixin from './align-mixin';

  export default {
    name: 'coachRecentReports',
    components: {
      coreTable,
      breadcrumbs,
      headerCell,
      nameCell,
      activityCell,
      contentIcon,
      progressBar,
    },
    mixins: [alignMixin],
    $trs: {
      title: 'Recent activity',
      name: 'Name',
      progress: 'Class progress',
      reportProgress: '{completed} {descriptor}',
      listened: '{proportionCompleted} listened',
      opened: '{proportionCompleted} opened',
      watched: '{proportionCompleted} watched',
      mastered: '{proportionCompleted} completed',
      lastActivity: 'Last activity',
      noRecentProgress: 'No activity in past {threshold} days',
    },
    computed: {
      tableColumns() {
        return TableColumns;
      },
      noProgressText() {
        return this.$tr('noRecentProgress', { threshold: RECENCY_THRESHOLD_IN_DAYS });
      },
    },
    methods: {
      progressString(row) {
        // string representation of a fraction, can't use completedProgress
        const proportionCompleted = `${row.logCountComplete}` + `/${this.userCount}`;
        switch (row.kind) {
          case ContentNodeKinds.AUDIO:
            return this.$tr('listened', { proportionCompleted });
          case ContentNodeKinds.DOCUMENT:
            return this.$tr('opened', { proportionCompleted });
          case ContentNodeKinds.VIDEO:
            return this.$tr('watched', { proportionCompleted });
          case ContentNodeKinds.EXERCISE:
            return this.$tr('mastered', { proportionCompleted });
          case ContentNodeKinds.HTML5:
            return this.$tr('mastered', { proportionCompleted });
          default:
            return this.$tr('mastered', { proportionCompleted });
        }
      },
      genLink(row) {
        return {
          name: PageNames.RECENT_LEARNERS_FOR_ITEM,
          params: {
            classId: this.classId,
            channelId: this.pageState.channelId,
            contentId: row.id,
          },
        };
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        pageState: state => state.pageState,
        userCount: classMemberCount,
        standardDataTable: reportGetters.standardDataTable,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
