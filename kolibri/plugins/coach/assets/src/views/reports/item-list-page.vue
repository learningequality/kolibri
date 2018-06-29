<template>

  <div>

    <breadcrumbs />
    <h1>
      <content-icon
        :kind="pageState.contentScopeSummary.kind"
        colorstyle="text-default"
      />
      {{ pageState.contentScopeSummary.title }}
    </h1>
    <div>
      <ul>
        <li>{{ $tr('exerciseCountText', {count: exerciseCount}) }}</li>
        <li>{{ $tr('contentCountText', {count: contentCount}) }}</li>
      </ul>
    </div>

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
            :text="$tr('avgExerciseProgress')"
            :sortable="true"
            :column="tableColumns.EXERCISE"
          />
          <header-cell
            :text="$tr('avgContentProgress')"
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
            :link="genRowLink(row)"
            :numCoachContents="row.num_coach_contents"
          >
            {{ $tr('exerciseCountText', {count: row.exerciseCount}) }}
            •
            {{ $tr('contentCountText', {count: row.contentCount}) }}
          </name-cell>
          <progress-cell :num="row.exerciseProgress" :isExercise="true" />
          <progress-cell :num="row.contentProgress" :isExercise="false" />
          <activity-cell :date="row.lastActive" />
        </tr>
      </tbody>
    </core-table>
    <p v-if="!standardDataTable.length">
      {{ $tr('emptyTableMessage') }}
    </p>

  </div>

</template>


<script>

  import coreTable from 'kolibri.coreVue.components.coreTable';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import { TopicReports, LearnerReports, PageNames } from '../../constants';
  import { exerciseCount, contentCount, standardDataTable } from '../../state/getters/reports';
  import { TableColumns } from '../../constants/reportConstants';
  import breadcrumbs from './breadcrumbs';
  import headerCell from './table-cells/header-cell';
  import nameCell from './table-cells/name-cell';
  import progressCell from './table-cells/progress-cell';
  import activityCell from './table-cells/activity-cell';

  import alignMixin from './align-mixin';

  export default {
    name: 'itemListPage',
    components: {
      coreTable,
      contentIcon,
      breadcrumbs,
      headerCell,
      nameCell,
      progressCell,
      activityCell,
    },
    mixins: [alignMixin],
    $trs: {
      name: 'Name',
      avgExerciseProgress: 'Avg. exercise progress',
      avgContentProgress: 'Avg. resource progress',
      lastActivity: 'Last activity',
      exerciseCountText:
        '{count, number, integer} {count, plural, one {exercise} other {exercises}}',
      contentCountText:
        '{count, number, integer} {count, plural, one {resource} other {resources}}',
      emptyTableMessage: 'No exercises or resources in this topic',
    },
    computed: {
      tableColumns() {
        return TableColumns;
      },
    },
    methods: {
      genRowLink(row) {
        const rowIsTopic = row.kind === ContentNodeKinds.TOPIC;
        const params = {
          classId: this.classId,
          channelId: this.pageState.channelId,
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
    vuex: {
      getters: {
        classId: state => state.classId,
        pageName: state => state.pageName,
        pageState: state => state.pageState,
        exerciseCount,
        contentCount,
        standardDataTable,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
