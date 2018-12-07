<template>

  <div>

    <Breadcrumbs />
    <h1>
      <ContentIcon
        :kind="contentScopeSummary.kind || ''"
        colorstyle="text-default"
      />
      {{ contentScopeSummary.title || '' }}
    </h1>
    <div>
      <ul>
        <li>{{ $tr('exerciseCountText', {count: exerciseCount}) }}</li>
        <li>{{ $tr('contentCountText', {count: contentCount}) }}</li>
      </ul>
    </div>

    <CoreTable>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <HeaderCell
            :text="$tr('titleColumnLabel')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.NAME"
          />
          <HeaderCell
            :text="$tr('avgExerciseProgress')"
            :sortable="true"
            :column="tableColumns.EXERCISE"
          />
          <HeaderCell
            :text="$tr('avgContentProgress')"
            :sortable="true"
            :column="tableColumns.CONTENT"
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
        <tr v-for="row in standardDataTable" :key="row.id">
          <td class="core-table-icon-col">
            <ContentIcon :kind="row.kind" />
          </td>
          <NameCell
            :kind="row.kind"
            :title="row.title"
            :link="genRowLink(row)"
            :numCoachContents="row.num_coach_contents"
          >
            {{ $tr('exerciseCountText', {count: row.exerciseCount}) }}
            •
            {{ $tr('contentCountText', {count: row.contentCount}) }}
          </NameCell>
          <ProgressCell :num="row.exerciseProgress" :isExercise="true" />
          <ProgressCell :num="row.contentProgress" :isExercise="false" />
          <ActivityCell :date="row.lastActive" />
        </tr>
      </tbody>
    </CoreTable>
    <p v-if="!standardDataTable.length">
      {{ $tr('emptyTableMessage') }}
    </p>

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { TopicReports, LearnerReports, PageNames } from '../../constants';
  import { TableColumns } from '../../constants/reportConstants';
  import Breadcrumbs from './Breadcrumbs';
  import HeaderCell from './table-cells/HeaderCell';
  import NameCell from './table-cells/NameCell';
  import ProgressCell from './table-cells/ProgressCell';
  import ActivityCell from './table-cells/ActivityCell';
  import alignMixin from './align-mixin';

  export default {
    name: 'ItemListPage',
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
    components: {
      CoreTable,
      ContentIcon,
      Breadcrumbs,
      HeaderCell,
      NameCell,
      ProgressCell,
      ActivityCell,
    },
    mixins: [alignMixin],
    $trs: {
      titleColumnLabel: 'Title',
      avgExerciseProgress: 'Avg. exercise progress',
      avgContentProgress: 'Avg. resource progress',
      lastActivity: 'Last activity',
      exerciseCountText:
        '{count, number, integer} {count, plural, one {exercise} other {exercises}}',
      contentCountText:
        '{count, number, integer} {count, plural, one {resource} other {resources}}',
      emptyTableMessage: 'No exercises or resources in this topic',
      documentTitleForChannelRoot: 'Topics - Channel',
      documentTitleForTopicItems: 'Topics - Items',
      documentTitleForLearnerChannelRoot: 'Learners - Channel',
      documentTitleForLearnerItems: 'Learners - Items',
    },
    computed: {
      ...mapGetters('reports', ['standardDataTable', 'contentCount', 'exerciseCount']),
      ...mapState(['classId', 'pageName', 'reportRefreshInterval']),
      ...mapState('reports', [
        'contentScopeSummary',
        'channelId',
        'contentScopeId',
        'userScope',
        'userScopeId',
      ]),
      documentTitle() {
        switch (this.pageName) {
          case PageNames.LEARNER_CHANNEL_ROOT:
            return this.$tr('documentTitleForLearnerChannelRoot');
          case PageNames.LEARNER_ITEM_LIST:
            return this.$tr('documentTitleForLearnerItems');
          case PageNames.TOPIC_CHANNEL_ROOT:
            return this.$tr('documentTitleForChannelRoot');
          case PageNames.TOPIC_ITEM_LIST:
            return this.$tr('documentTitleForTopicItems');
        }
      },
      tableColumns() {
        return TableColumns;
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
        // The data needed to do a proper refresh. See _showContentList for details
        this.$store.dispatch('reports/setItemsForTopicTableData', {
          reportPayload: {
            channel_id: this.channelId,
            content_node_id: this.contentScopeId,
            collection_kind: this.userScope,
            collection_id: this.userScopeId,
          },
          isSamePage: samePageCheckGenerator(this.$store),
        });
      },
      genRowLink(row) {
        const rowIsTopic = row.kind === ContentNodeKinds.TOPIC;
        const params = {
          classId: this.classId,
          channelId: this.channelId,
          [rowIsTopic ? 'topicId' : 'contentId']: row.id,
        };
        if (TopicReports.includes(this.pageName)) {
          return {
            name: rowIsTopic ? PageNames.TOPIC_ITEM_LIST : PageNames.TOPIC_LEARNERS_FOR_ITEM,
            params,
          };
        } else if (LearnerReports.includes(this.pageName)) {
          if (rowIsTopic) {
            return {
              name: PageNames.LEARNER_ITEM_LIST,
              params,
            };
          } else if (row.kind === ContentNodeKinds.EXERCISE) {
            return {
              name: PageNames.LEARNER_ITEM_DETAILS_ROOT,
              params,
            };
          }
        }
        return null;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
