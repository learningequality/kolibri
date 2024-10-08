<template>

  <CoachAppBarPage>
    <KPageContainer>
      <ReportsResourceHeader
        :resource="resource"
        @previewClick="onPreviewClick"
      />

      <ReportsControls @export="exportCSV">
        <KCheckbox
          :label="coachString('viewByGroupsLabel')"
          :checked="viewByGroups"
          @change="toggleGroupsView"
        />
      </ReportsControls>

      <div v-if="viewByGroups">
        <div
          v-for="group in lessonGroups"
          :key="group.id"
          :data-test="`group-${group.id}`"
          class="group"
        >
          <h2
            class="group-title"
            data-test="group-title"
          >
            <KLabeledIcon
              icon="group"
              :label="group.name"
            />
          </h2>

          <ReportsResourcesStats
            :avgTime="getGroupRecipientsAvgTime(group.id)"
            :className="className"
            :lessonName="lesson.title"
            data-test="group-resources-stats"
          />

          <p>
            <StatusSummary
              :tally="getGroupTally(group.id)"
              :showNeedsHelp="false"
              :verbose="false"
              data-test="group-tally"
            />
          </p>

          <ReportsLearnersTable
            :entries="getGroupEntries(group.id)"
            :showGroupsColumn="false"
          />
        </div>

        <div
          v-if="ungroupedEntries.length"
          class="group"
        >
          <h2
            class="group-title"
            data-test="group-title"
          >
            {{ coachString('ungroupedLearnersLabel') }}
          </h2>

          <ReportsLearnersTable
            :entries="ungroupedEntries"
            :showGroupsColumn="false"
          />
        </div>
      </div>

      <template v-else>
        <ReportsResourcesStats
          :avgTime="allRecipientsAvgTime"
          :className="className"
          :lessonName="lesson.title"
          data-test="summary-resources-stats"
        />

        <p>
          <StatusSummary
            :tally="summaryTally"
            data-test="summary-tally"
          />
        </p>

        <ReportsLearnersTable :entries="allEntries" />
      </template>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import fromPairs from 'lodash/fromPairs';
  import { mapState } from 'vuex';
  import { LastPages } from '../../constants/lastPagesConstants';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsLearnersTable from './ReportsLearnersTable';
  import ReportsResourcesStats from './ReportsResourcesStats';
  import ReportsControls from './ReportsControls';
  import ReportsResourceHeader from './ReportsResourceHeader';

  export default {
    name: 'ReportsLessonResourceLearnerListPage',
    components: {
      CoachAppBarPage,
      ReportsLearnersTable,
      ReportsResourcesStats,
      ReportsControls,
      ReportsResourceHeader,
    },
    mixins: [commonCoach],
    data() {
      return {
        viewByGroups: Boolean(this.$route.query.groups),
      };
    },
    computed: {
      ...mapState('resourceDetail', ['resource']),
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      recipients() {
        return this.getLearnersForLesson(this.lesson);
      },
      allRecipientsAvgTime() {
        return this.getContentAvgTimeSpent(this.$route.params.resourceId, this.recipients);
      },
      summaryTally() {
        return this.getContentStatusTally(this.$route.params.resourceId, this.recipients);
      },
      lessonGroups() {
        if (!this.lesson.groups.length) {
          return this.groups;
        }

        return this.groups.filter(group => this.lesson.groups.includes(group.id));
      },
      allEntries() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = sortBy(learners, ['name']);
        return sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            statusObj: this.getContentStatusObjForLearner(
              this.$route.params.resourceId,
              learner.id,
            ),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
      ungroupedEntries() {
        return this.allEntries.filter(entry => !entry.groups || !entry.groups.length);
      },
    },
    watch: {
      $route() {
        this.viewByGroups = Boolean(this.$route.query.groups);
      },
    },
    methods: {
      toggleGroupsView() {
        this.viewByGroups = !this.viewByGroups;

        let query;
        if (this.viewByGroups) {
          query = { ...this.$route.query, groups: 'true' };
        } else {
          query = { ...this.$route.query, groups: undefined };
        }

        this.$router.replace({ query });
      },
      getGroupEntries(groupId) {
        const learnerIdMap = fromPairs(
          this.getLearnersForGroups([groupId]).map(learnerId => [learnerId, true]),
        );
        return this.allEntries.filter(entry => {
          return learnerIdMap[entry.id];
        });
      },
      getGroupTally(groupId) {
        const recipients = this.getLearnersForGroups([groupId]);
        return this.getContentStatusTally(this.$route.params.resourceId, recipients);
      },
      getGroupRecipientsAvgTime(groupId) {
        const recipients = this.getLearnersForGroups([groupId]);
        return this.getContentAvgTimeSpent(this.$route.params.resourceId, recipients);
      },
      onPreviewClick() {
        let lastPage = LastPages.RESOURCE_LEARNER_LIST;
        if (this.viewByGroups) {
          lastPage = LastPages.RESOURCE_LEARNER_LIST_BY_GROUPS;
        }

        this.$router.push(
          this.$router.getRoute(
            'RESOURCE_CONTENT_PREVIEW',
            {
              contentId: this.resource.id,
            },
            {
              last: lastPage,
              resourceId: this.resource.content_id,
            },
          ),
        );
      },
      exportCSV() {
        const columns = [];

        if (this.viewByGroups) {
          columns.push({
            name: this.coachString('groupNameLabel'),
            key: 'groupName',
          });
        }

        columns.push(
          ...csvFields.name(),
          ...csvFields.learnerProgress('statusObj.status'),
          ...csvFields.timeSpent('statusObj.time_spent'),
        );

        if (!this.viewByGroups) {
          columns.push(...csvFields.list('groups', 'groupsLabel'));
        }

        columns.push(...csvFields.lastActivity('statusObj.last_activity'));

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          lesson: this.lesson.title,
          resource: this.resource.title,
        });

        if (!this.viewByGroups) {
          exporter.export(this.allEntries);
          return;
        }

        const data = this.lessonGroups
          .map(group => {
            return this.getGroupEntries(group.id).map(entry => {
              entry.groupName = group.name;
              return entry;
            });
          })
          .reduce((entries, groupEntries) => entries.concat(groupEntries), []);

        if (this.ungroupedEntries.length) {
          data.push(
            ...this.ungroupedEntries.map(entry => {
              entry.groupName = '';
              return entry;
            }),
          );
        }

        exporter.export(data);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .group:not(:first-child) {
    margin-top: 42px;
  }

  .group-title {
    margin-bottom: 24px;
  }

</style>
