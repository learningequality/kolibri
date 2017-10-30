<template>

  <div>

    <breadcrumbs />
    <h1>{{ $tr('title') }}</h1>
    <report-subheading />

    <report-table v-if="standardDataTable.length">
      <thead slot="thead">
        <tr>
          <header-cell
            :text="$tr('name')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.NAME" />
          <header-cell
            :text="$tr('progress')"
            :sortable="true"
            :column="tableColumns.CONTENT" />
          <header-cell
            :text="$tr('lastActivity')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.DATE" />
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr v-for="row in standardDataTable" :key="row.id">
          <name-cell
            :kind="row.kind"
            :title="row.title"
            :link="genLink(row)"
          />
          <td>
            <progress-bar :showPercentage="false" :progress="row.contentProgress" />
            {{ progressString(row) }}
          </td>
          <activity-cell :date="row.lastActive" />
        </tr>
      </tbody>
    </report-table>


  </div>

</template>


<script>

  import * as CoachConstants from '../../constants';
  import * as reportConstants from '../../reportConstants';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import * as mainGetters from '../../state/getters/main';
  import * as reportGetters from '../../state/getters/reports';
  import breadcrumbs from './breadcrumbs';
  import reportTable from './report-table';
  import reportSubheading from './report-subheading';
  import headerCell from './table-cells/header-cell';
  import nameCell from './table-cells/name-cell';
  import activityCell from './table-cells/activity-cell';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import alignMixin from './align-mixin';
  export default {
    name: 'coachRecentReports',
    components: {
      breadcrumbs,
      reportTable,
      reportSubheading,
      headerCell,
      nameCell,
      activityCell,
      contentIcon,
      progressBar,
    },
    mixins: [alignMixin],
    $trs: {
      title: 'Recent Activity',
      name: 'Name',
      progress: 'Class progress',
      reportProgress: '{completed} {descriptor}',
      listened: '{proportionCompleted} listened',
      opened: '{proportionCompleted} opened',
      watched: '{proportionCompleted} watched',
      mastered: '{proportionCompleted} completed',
      lastActivity: 'Last activity',
    },
    computed: {
      tableColumns() {
        return reportConstants.TableColumns;
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
          name: CoachConstants.PageNames.RECENT_LEARNERS_FOR_ITEM,
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
        userCount: mainGetters.classMemberCount,
        standardDataTable: reportGetters.standardDataTable,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
