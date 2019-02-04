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
        <StatusSummary :tally="tally" />
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
              <StatusSimple :status="tableRow.status" />
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

  import commonCoach from '../common';

  export default {
    name: 'ReportsLessonResourceLearnerListPage',
    components: {},
    mixins: [commonCoach],
    computed: {
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
      tally() {
        return this.getContentStatusTally(this.$route.params.resourceId, this.recipients);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = this._.sortBy(learners, ['name']);
        const mapped = sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            status: this.getContentStatusObjForLearner(this.$route.params.resourceId, learner.id),
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
