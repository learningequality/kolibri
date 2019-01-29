<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <p>
        <BackLink
          :to="classRoute('ReportsLessonReportPage', {})"
          :text="$tr('back', { lesson: lesson.title })"
        />
      </p>
      <h1>{{ resource.title }}</h1>
      <!-- TODO COACH
      <KButton :text="coachStrings.$tr('previewAction')" />
      <KCheckbox :label="coachStrings.$tr('viewByGroupsLabel')" />
      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
       -->
      <HeaderTable v-if="avgTime">
        <HeaderTableRow>
          <template slot="key">{{ coachStrings.$tr('avgTimeSpentLabel') }}</template>
          <template slot="value"><TimeDuration :seconds="avgTime" /></template>
        </HeaderTableRow>
      </HeaderTable>

      <p>
        <LearnerProgressCount
          :verbosity="0"
          :count="statusCounts[STATUSES.completed]"
          :verb="VERBS.completed"
          :icon="ICONS.star"
        />
        <LearnerProgressCount
          :verbosity="0"
          :count="statusCounts[STATUSES.started]"
          :verb="VERBS.started"
          :icon="ICONS.clock"
        />
        <LearnerProgressCount
          :verbosity="0"
          :count="statusCounts[STATUSES.notStarted]"
          :verb="VERBS.notStarted"
          :icon="ICONS.nothing"
        />
      </p>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('nameLabel') }}</td>
            <td>{{ coachStrings.$tr('statusLabel') }}</td>
            <td>{{ coachStrings.$tr('timeSpentLabel') }}</td>
            <td>{{ coachStrings.$tr('groupsLabel') }}</td>
            <td>{{ coachStrings.$tr('lastActivityLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>{{ tableRow.name }}</td>
            <td>
              <LearnerProgressLabel
                v-if="!tableRow.status || tableRow.status.status === STATUSES.notStarted"
                :count="1"
                :verbosity="1"
                :verb="VERBS.notStarted"
                :icon="ICONS.nothing"
              />
              <LearnerProgressLabel
                v-else-if="tableRow.status.status === STATUSES.started"
                :count="1"
                :verbosity="1"
                :verb="VERBS.started"
                :icon="ICONS.clock"
              />
              <LearnerProgressLabel
                v-else-if="tableRow.status.status === STATUSES.completed"
                :count="1"
                :verbosity="1"
                :verb="VERBS.completed"
                :icon="ICONS.star"
              />
              <LearnerProgressLabel
                v-else-if="tableRow.status.status === STATUSES.helpNeeded"
                :count="1"
                :verbosity="1"
                :verb="VERBS.needHelp"
                :icon="ICONS.star"
              />
            </td>
            <td>
              <TimeDuration :seconds="tableRow.status.time_spent" />
            </td>
            <td><TruncatedItemList :items="tableRow.groups" /></td>
            <td>
              <ElapsedTime
                v-if="tableRow.status"
                :date="tableRow.status.last_activity "
              />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import get from 'lodash/get';
  import commonCoach from '../common';

  export default {
    name: 'ReportsLessonResourceLearnerListPage',
    components: {},
    mixins: [commonCoach],
    computed: {
      ...mapState('classSummary', [
        'lessonMap',
        'learnerMap',
        'contentMap',
        'contentNodeMap',
        'contentLearnerStatusMap',
      ]),
      ...mapGetters('classSummary', [
        'groups',
        'getLearnersForGroups',
        'getContentAvgTimeSpent',
        'getGroupNames',
        'getContentStatusCounts',
        'getGroupNamesForLearner',
      ]),
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      resource() {
        return this.contentMap[this.$route.params.resourceId];
      },
      recipients() {
        return this.getLearnersForGroups(this.lesson.groups);
      },
      avgTime() {
        return this.getContentAvgTimeSpent(this.$route.params.resourceId, this.recipients);
      },
      statusCounts() {
        return this.getContentStatusCounts(this.$route.params.resourceId, this.recipients);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = this._.sortBy(learners, ['name']);
        const mapped = sorted.map(learner => {
          // get a status object, with default being undefined
          const status = get(
            this.contentLearnerStatusMap,
            [this.$route.params.resourceId, learner.id],
            {}
          );
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            status,
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
        return mapped;
      },
    },
    $trs: {
      back: "Back to '{lesson}'",
      avgNumViews: 'Average number of views',
    },
  };

</script>


<style lang="scss" scoped></style>
