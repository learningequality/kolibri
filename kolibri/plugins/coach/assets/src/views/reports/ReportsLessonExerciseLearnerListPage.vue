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
          class="group"
          :data-test="`group-${group.id}`"
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

          <p>
            <StatusSummary
              :tally="getGroupTally(group.id)"
              :verbose="false"
              data-test="group-tally"
            />
          </p>

          <ReportsLearnersTable
            :entries="getGroupEntries(group.id)"
            :showGroupsColumn="false"
            :questionCount="numAssessments"
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
            :questionCount="numAssessments"
          />
        </div>
      </div>

      <div v-else>
        <p>
          <StatusSummary
            :tally="summaryTally"
            data-test="summary-tally"
          />
        </p>

        <ReportsLearnersTable
          :entries="allEntries"
          :questionCount="numAssessments"
        />
      </div>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import fromPairs from 'lodash/fromPairs';
  import { mapState } from 'vuex';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import { PageNames } from '../../constants';
  import { LastPages } from '../../constants/lastPagesConstants';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsResourceHeader from './ReportsResourceHeader';
  import ReportsLearnersTable from './ReportsLearnersTable';
  import ReportsControls from './ReportsControls';

  export default {
    name: 'ReportsLessonExerciseLearnerListPage',
    components: {
      CoachAppBarPage,
      ReportsResourceHeader,
      ReportsLearnersTable,
      ReportsControls,
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
      exercise() {
        return this.contentMap[this.$route.params.exerciseId];
      },
      summaryTally() {
        return this.getContentStatusTally(this.$route.params.exerciseId, this.recipients);
      },
      lessonGroups() {
        if (!this.lesson.groups.length) {
          return this.groups;
        }

        return this.groups.filter(group => this.lesson.groups.includes(group.id));
      },
      recipients() {
        return this.getLearnersForLesson(this.lesson);
      },
      allEntries() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);

        const sorted = sortBy(learners, ['name']);
        return sorted.map(learner => {
          const groups = this.getGroupNamesForLearner(learner.id);
          const tableRow = {
            groups,
            statusObj: this.getContentStatusObjForLearner(
              this.$route.params.exerciseId,
              learner.id,
            ),
            link: this.getExerciseLearnerLink(learner.id),
          };

          Object.assign(tableRow, learner);

          return tableRow;
        });
      },
      ungroupedEntries() {
        return this.allEntries.filter(entry => !entry.groups || !entry.groups.length);
      },
      numAssessments() {
        return (
          this.resource.assessmentmetadata && this.resource.assessmentmetadata.number_of_assessments
        );
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
      getExerciseLearnerLink(learnerId) {
        const link = this.classRoute(PageNames.REPORTS_LESSON_EXERCISE_LEARNER_PAGE_ROOT, {
          learnerId,
        });

        if (this.viewByGroups) {
          link.query = {
            ...link.query,
            last: LastPages.EXERCISE_LEARNER_LIST_BY_GROUPS,
            exerciseId: this.exercise.content_id,
          };
        }

        return link;
      },
      getGroupTally(groupId) {
        const recipients = this.getLearnersForGroups([groupId]);
        return this.getContentStatusTally(this.$route.params.exerciseId, recipients);
      },
      getGroupEntries(groupId) {
        const learnerIdMap = fromPairs(
          this.getLearnersForGroups([groupId]).map(learnerId => [learnerId, true]),
        );
        return this.allEntries.filter(entry => {
          return learnerIdMap[entry.id];
        });
      },
      onPreviewClick() {
        let lastPage = LastPages.EXERCISE_LEARNER_LIST;
        if (this.viewByGroups) {
          lastPage = LastPages.EXERCISE_LEARNER_LIST_BY_GROUPS;
        }

        this.$router.push(
          this.$router.getRoute(
            'RESOURCE_CONTENT_PREVIEW',
            {
              contentId: this.exercise.node_id,
            },
            {
              last: lastPage,
              exerciseId: this.exercise.content_id,
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
          resource: this.exercise.title,
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
    margin-bottom: 42px;
  }

</style>
