<template>

  <CoachAppBarPage>
    <KPageContainer>
      <CoachHeader
        :title="$isPrint ? $tr('printLabel', { className }) : coachString('learnersLabel')"
      />
      <div class="filter">
        <KSelect
          v-model="filterSelection"
          :label="coachString('recipientsLabel')"
          :options="filterOptions"
          :inline="true"
        />
      </div>
      <div>
        <ReportsControls @export="exportCSV" />
        <CoreTable :emptyMessage="coachString('learnerListEmptyState')">
          <template #headers>
            <th>{{ coachString('nameLabel') }}</th>
            <th>{{ coachString('groupsLabel') }}</th>
            <th>{{ coachString('avgScoreLabel') }}</th>
            <th>{{ coachString('exercisesCompletedLabel') }}</th>
            <th>{{ coachString('resourcesViewedLabel') }}</th>
            <th>{{ coachString('lastActivityLabel') }}</th>
          </template>
          <template #tbody>
            <transition-group
              tag="tbody"
              name="list"
            >
              <tr
                v-for="tableRow in table"
                :key="tableRow.id"
              >
                <td>
                  <KRouterLink
                    :text="tableRow.name"
                    :to="classRoute(PageNames.LEARNER_SUMMARY, { learnerId: tableRow.id })"
                    icon="person"
                  />
                </td>
                <td>
                  <TruncatedItemList :items="tableRow.groups" />
                </td>
                <td>
                  <Score :value="tableRow.avgScore" />
                </td>
                <td>{{ $formatNumber(tableRow.exercises) }}</td>
                <td>{{ $formatNumber(tableRow.resources) }}</td>
                <td>
                  <ElapsedTime :date="tableRow.lastActivity" />
                </td>
              </tr>
            </transition-group>
          </template>
        </CoreTable>
      </div>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import ElapsedTime from 'kolibri-common/components/ElapsedTime';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import CoachHeader from '../common/CoachHeader';
  import ReportsControls from '../common/ReportsControls';
  import { PageNames } from '../../constants';

  export default {
    name: 'LearnersRootPage',
    components: {
      CoachAppBarPage,
      ReportsControls,
      ElapsedTime,
      CoachHeader,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        filterOptions: [
          {
            label: this.coreString('allLabel'),
            value: this.coreString('allLabel'),
          },
        ],
        filterSelection: { label: this.coreString('allLabel'), value: this.coreString('allLabel') },
        PageNames,
      };
    },
    computed: {
      table() {
        const sorted = sortBy(this.learners, ['name']);
        return sorted.map(learner => {
          const groupNames = this.getGroupNames(
            this._.map(
              this.groups.filter(group => group.member_ids.includes(learner.id)),
              'id',
            ),
          );
          const examStatuses = this.examStatuses.filter(status => learner.id === status.learner_id);
          const contentStatuses = this.contentStatuses.filter(
            status => learner.id === status.learner_id,
          );
          const augmentedObj = {
            groups: groupNames,
            avgScore: this.avgScore(examStatuses),
            lessons: undefined,
            exercises: this.exercisesCompleted(contentStatuses),
            resources: this.resourcesViewed(contentStatuses),
            lastActivity: this.lastActivity(examStatuses, contentStatuses),
          };
          Object.assign(augmentedObj, learner);
          return augmentedObj;
        });
      },
    },
    methods: {
      avgScore(examStatuses) {
        const statuses = examStatuses.filter(status => status.status === this.STATUSES.completed);
        if (!statuses.length) {
          return null;
        }
        return this._.meanBy(statuses, 'score');
      },
      lastActivity(examStatuses, contentStatuses) {
        const statuses = [
          ...examStatuses,
          ...contentStatuses.filter(status => status.status !== this.STATUSES.notStarted),
        ];

        return statuses.length ? this.maxLastActivity(statuses) : null;
      },
      exercisesCompleted(contentStatuses) {
        const statuses = contentStatuses.filter(
          status =>
            this.contentIdIsForExercise(status.content_id) &&
            status.status === this.STATUSES.completed,
        );
        return statuses.length;
      },
      resourcesViewed(contentStatuses) {
        const statuses = contentStatuses.filter(
          status =>
            !this.contentIdIsForExercise(status.content_id) &&
            status.status !== this.STATUSES.notStarted,
        );
        return statuses.length;
      },
      exportCSV() {
        const columns = [
          ...csvFields.name(),
          ...csvFields.list('groups', 'groupsLabel'),
          ...csvFields.avgScore(true),
          {
            name: this.coachString('exercisesCompletedLabel'),
            key: 'exercises',
          },
          {
            name: this.coachString('resourcesViewedLabel'),
            key: 'resources',
          },
          ...csvFields.lastActivity(),
        ];

        const fileName = this.$tr('printLabel', { className: this.className });
        new CSVExporter(columns, fileName).export(this.table);
      },
    },
    $trs: {
      printLabel: {
        message: '{className} Learners',
        context:
          "Title that displays on a printed copy of the 'Reports' > 'Learners' page. This shows if the user uses the 'Print' option by clicking on the printer icon.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .class-name-icon {
    position: relative;
    top: 0.4em;
    width: 1.5em;
    height: 1.5em;
    margin-right: 0.5em;
  }

  .filter {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

</style>
