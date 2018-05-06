<template>

  <div>

    <breadcrumbs />
    <template v-if="!isRootLearnerPage">
      <h1>
        <content-icon
          :kind="pageState.contentScopeSummary.kind"
          colorstyle="text-default"
        />
        {{ pageState.contentScopeSummary.title }}
      </h1>
      <coach-content-label
        :isTopic="isTopic(pageState.contentScopeSummary)"
        :value="pageState.contentScopeSummary.num_coach_contents"
      />
    </template>
    <h1 v-else>{{ $tr('learners') }}</h1>

    <core-table>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <header-cell
            :align="alignStart"
            :text="$tr('name')"
            :column="TableColumns.NAME"
            :sortable="true"
          />
          <header-cell
            v-if="!isRootLearnerPage"
            :text="isExercisePage ? $tr('exerciseProgress') : $tr('contentProgress')"
            :column="isExercisePage ? TableColumns.EXERCISE : TableColumns.CONTENT"
            :sortable="true"
          />
          <header-cell
            :align="alignStart"
            :text="$tr('group')"
            :column="TableColumns.GROUP"
            :sortable="true"
          />
          <header-cell
            :align="alignStart"
            v-if="!isRootLearnerPage"
            :text="$tr('lastActivity')"
            :column="TableColumns.DATE"
            :sortable="true"
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
          />
          <progress-cell
            v-if="!isRootLearnerPage"
            :num="isExercisePage ? row.exerciseProgress : row.contentProgress"
            :isExercise="isExercisePage"
          />
          <td>{{ row.groupName || '–' }}</td>
          <activity-cell v-if="!isRootLearnerPage" :date="row.lastActive" />
        </tr>
      </tbody>
    </core-table>

    <p v-if="!standardDataTable.length">{{ $tr('noLearners') }}</p>

  </div>

</template>


<script>

  import coreTable from 'kolibri.coreVue.components.coreTable';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import { PageNames } from '../../constants';
  import { exerciseCount, contentCount, standardDataTable } from '../../state/getters/reports';
  import { TableColumns } from '../../constants/reportConstants';
  import breadcrumbs from './breadcrumbs';
  import headerCell from './table-cells/header-cell';
  import nameCell from './table-cells/name-cell';
  import progressCell from './table-cells/progress-cell';
  import activityCell from './table-cells/activity-cell';
  import alignMixin from './align-mixin';

  export default {
    name: 'learnerReportPage',
    components: {
      coachContentLabel,
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
      learners: 'Learner reports',
      name: 'Name',
      group: 'Group',
      channelIconColumnHeader: 'Channel icon',
      userIconColumnHeader: 'User icon',
      exerciseProgress: 'Exercise progress',
      contentProgress: 'Resource progress',
      lastActivity: 'Last activity',
      exerciseCountText:
        '{count, number, integer} {count, plural, one {exercise} other {exercises}}',
      contentCountText:
        '{count, number, integer} {count, plural, one {resource} other {resources}}',
      noLearners: 'There are no learners enrolled in this class',
    },
    computed: {
      isExercisePage() {
        return this.pageState.contentScopeSummary.kind === ContentNodeKinds.EXERCISE;
      },
      isRootLearnerPage() {
        return this.pageName === PageNames.LEARNER_LIST;
      },
      TableColumns() {
        return TableColumns;
      },
    },
    methods: {
      isTopic(row) {
        return row.kind === ContentNodeKinds.TOPIC;
      },
      genLink(row) {
        if (this.isExercisePage) {
          const targetName =
            this.pageName === PageNames.RECENT_LEARNERS_FOR_ITEM
              ? PageNames.RECENT_LEARNER_ITEM_DETAILS_ROOT
              : PageNames.TOPIC_LEARNER_ITEM_DETAILS_ROOT;
          return {
            name: targetName,
            params: {
              classId: this.classId,
              userId: row.id,
              channelId: this.pageState.channelId,
              contentId: this.pageState.contentScopeSummary.id,
            },
          };
        } else if (this.isRootLearnerPage) {
          return {
            name: PageNames.LEARNER_CHANNELS,
            params: {
              classId: this.classId,
              userId: row.id,
            },
          };
        }
        return undefined;
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        pageState: state => state.pageState,
        pageName: state => state.pageName,
        exerciseCount,
        contentCount,
        standardDataTable,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
