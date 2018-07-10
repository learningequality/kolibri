<template>

  <div>

    <breadcrumbs />
    <template v-if="!isRootLearnerPage">
      <h1>
        <content-icon
          :kind="contentScopeSummary.kind"
          colorstyle="text-default"
        />
        {{ contentScopeSummary.title }}
      </h1>
      <coach-content-label
        :isTopic="isTopic(contentScopeSummary)"
        :value="contentScopeSummary.num_coach_contents"
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

  import { mapState } from 'vuex';
  import coreTable from 'kolibri.coreVue.components.coreTable';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import { standardDataTable, exerciseCount, contentCount } from '../../state/getters/reports';
  import { PageNames } from '../../constants';
  import { TableColumns } from '../../constants/reportConstants';
  import breadcrumbs from './breadcrumbs';
  import headerCell from './table-cells/header-cell';
  import nameCell from './table-cells/name-cell';
  import progressCell from './table-cells/progress-cell';
  import activityCell from './table-cells/activity-cell';
  import alignMixin from './align-mixin';

  export default {
    name: 'learnerReportPage',
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
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
      documentTitleForRecentItems: 'Recent - Learners',
      documentTitleForTopicItems: 'Topics - Learners',
      documentTitleForLearners: 'Learners',
    },
    computed: {
      ...mapState(['classId', 'pageState', 'pageName']),
      ...mapState({
        channelId: state => state.pageState.channelId,
        contentCount,
        contentScopeSummary: state => state.pageState.contentScopeSummary,
        exerciseCount,
        standardDataTable,
      }),
      documentTitle() {
        switch (this.pageName) {
          case PageNames.LEARNER_LIST:
            return this.$tr('documentTitleForLearners');
          case PageNames.RECENT_LEARNERS_FOR_ITEM:
            return this.$tr('documentTitleForRecentItems');
          case PageNames.TOPIC_LEARNERS_FOR_ITEM:
            return this.$tr('documentTitleForTopicItems');
        }
      },
      isExercisePage() {
        return this.contentScopeSummary.kind === ContentNodeKinds.EXERCISE;
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
              channelId: this.channelId,
              contentId: this.contentScopeSummary.id,
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
  };

</script>


<style lang="scss" scoped></style>
