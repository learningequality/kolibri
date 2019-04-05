<template>

  <div>

    <Breadcrumbs/>
    <template v-if="!isRootLearnerPage">
      <h1>
        <ContentIcon
          :kind="contentScopeSummary.kind"
          colorstyle="text-default"
        />
        <span dir="auto">{{ contentScopeSummary.title }}</span>
      </h1>
      <CoachContentLabel
        :isTopic="isTopic(contentScopeSummary)"
        :value="contentScopeSummary.num_coach_contents"
      />
    </template>

    <KGrid v-else>
      <KGridItem sizes="100, 50, 50" percentage>
        <h1>{{ $tr('learners') }}</h1>
      </KGridItem>
      <KGridItem sizes="100, 50, 50" percentage align="right">
        <KButton
          v-if="className"
          :text="$tr('newUserButtonLabel')"
          :primary="true"
          @click="displayModal(Modals.COACH_CREATE_USER)"
        />
      </KGridItem>
    </KGrid>

    <CoreTable>
      <thead slot="thead">
      <tr>
        <th class="core-table-icon-col"></th>
        <HeaderCell
          :align="alignStart"
          :text="$tr('fullNameColumnLabel')"
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
          v-if="!isRootLearnerPage"
          :align="alignStart"
          :text="$tr('lastActivity')"
          :column="TableColumns.DATE"
          :sortable="true"
        />
      </tr>
      </thead>
      <tbody slot="tbody">
      <tr v-for="row in standardDataTable" :key="row.id">
        <td class="core-table-icon-col">
          <ContentIcon :kind="row.kind"/>
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
        <td dir="auto">{{ row.groupName || '–' }}</td>
        <ActivityCell v-if="!isRootLearnerPage" :date="row.lastActive"/>
      </tr>
      </tbody>
    </CoreTable>

    <p v-if="!standardDataTable.length">{{ $tr('noLearners') }}</p>

    <CoachUserCreateModal
      v-if="modalShown===Modals.COACH_CREATE_USER"
      :classId="thisClassId"
      :className="thisClassName"
    />

  </div>

</template>


<script>

  import {mapActions, mapState, mapGetters} from 'vuex';
  import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import {ContentNodeKinds} from 'kolibri.coreVue.vuex.constants';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KButton from 'kolibri.coreVue.components.KButton';
  import {PageNames, Modals} from '../../constants';
  import {TableColumns} from '../../constants/reportConstants';
  import CoachUserCreateModal from './CoachUserCreateModal';
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
        className: this.className,
      };
    },
    components: {
      CoachUserCreateModal,
      CoachContentLabel,
      CoreTable,
      ContentIcon,
      Breadcrumbs,
      HeaderCell,
      NameCell,
      ProgressCell,
      ActivityCell,
      KGridItem,
      KGrid,
      KButton,
    },
    mixins: [alignMixin],
    $trs: {
      learners: 'Learner reports',
      fullNameColumnLabel: 'Full name',
      newUserButtonLabel: 'New Learner',
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
      ...mapState(['classId', 'className', 'pageName', 'reportRefreshInterval']),
      ...mapGetters('reports', ['standardDataTable', 'exerciseCount', 'contentCount']),
      ...mapState('reports', ['channelId', 'contentScopeSummary', 'contentScopeId', 'userScope']),
      ...mapGetters(['currentUserId', 'isSuperuser', 'isCoach']),
      ...mapState('userManagement', ['facilityUsers', 'modalShown']),
      Modals: () => Modals,
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
      thisClassName() {
        return this.className;
      },
      thisClassId() {
        return this.classId;
      },
      isRootLearnerPage() {
        return this.pageName === PageNames.LEARNER_LIST;
      },
      TableColumns() {
        return TableColumns;
      },
    },
    mounted() {
      // This is assuming that it is impossible to go from LEARNER_LIST (not refreshed) to
      // RECENT/TOPIC_LEARNERS_FOR_ITEM (refreshed) directly.
      if (
        this.pageName === PageNames.RECENT_LEARNERS_FOR_ITEM ||
        this.pageName === PageNames.TOPIC_LEARNERS_FOR_ITEM
      ) {
        this.intervalId = setInterval(this.refreshReportData, this.reportRefreshInterval);
      }
    },
    beforeDestroy() {
      this.setInterval = clearInterval(this.intervalId);
    },
    methods: {
      ...mapActions('userManagement', ['displayModal']),
      refreshReportData() {
        // The data needed to do a proper refresh. See _showClassLearnerList for details
        return this.$store.dispatch('reports/setLearnersForItemTableData', {
          reportPayload: {
            channel_id: this.channelId,
            content_node_id: this.contentScopeId,
            collection_kind: this.userScope,
            collection_id: this.classId,
          },
          isSamePage: samePageCheckGenerator(this.$store),
        });
      },
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
