<template>

  <div>

    <Breadcrumbs />
    <template v-if="!isRootLearnerPage">
      <h1>
        <ContentIcon
          :kind="contentScopeSummary.kind"
          colorstyle="text-default"
        />
        {{ contentScopeSummary.title }}
      </h1>
      <CoachContentLabel
        :isTopic="isTopic(contentScopeSummary)"
        :value="contentScopeSummary.num_coach_contents"
      />
    </template>
    <h1 v-else>{{ $tr('learners') }}</h1>

    <CoreTable>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <HeaderCell
            :align="alignStart"
            :text="$tr('name')"
            :column="TableColumns.NAME"
            :sortable="true"
          />
          <HeaderCell
            v-if="!isRootLearnerPage"
            :text="isExercisePage ? $tr('exerciseProgress') : $tr('contentProgress')"
            :column="isExercisePage ? TableColumns.EXERCISE : TableColumns.CONTENT"
            :sortable="true"
          />
          <HeaderCell
            :align="alignStart"
            :text="$tr('group')"
            :column="TableColumns.GROUP"
            :sortable="true"
          />
          <HeaderCell
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
            <ContentIcon :kind="row.kind" />
          </td>
          <NameCell
            :kind="row.kind"
            :title="row.title"
            :link="genLink(row)"
          />
          <ProgressCell
            v-if="!isRootLearnerPage"
            :num="isExercisePage ? row.exerciseProgress : row.contentProgress"
            :isExercise="isExercisePage"
          />
          <td>{{ row.groupName || '–' }}</td>
          <ActivityCell v-if="!isRootLearnerPage" :date="row.lastActive" />
        </tr>
      </tbody>
    </CoreTable>

    <p v-if="!standardDataTable.length">{{ $tr('noLearners') }}</p>

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import { PageNames } from '../../constants';
  import { TableColumns } from '../../constants/reportConstants';
  import Breadcrumbs from './Breadcrumbs';
  import HeaderCell from './table-cells/HeaderCell';
  import NameCell from './table-cells/NameCell';
  import ProgressCell from './table-cells/ProgressCell';
  import ActivityCell from './table-cells/ActivityCell';
  import alignMixin from './align-mixin';

  export default {
    name: 'LearnerListPage',
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
    components: {
      CoachContentLabel,
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
      ...mapState(['classId', 'pageName']),
      ...mapGetters('reports', ['standardDataTable', 'exerciseCount', 'contentCount']),
      ...mapState('reports', ['channelId', 'contentScopeSummary']),
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
