<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
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
            <th>{{ coachStrings.$tr('nameLabel') }}</th>
            <th>{{ coachStrings.$tr('statusLabel') }}</th>
            <th>{{ coachStrings.$tr('timeSpentLabel') }}</th>
            <th>{{ coachStrings.$tr('groupsLabel') }}</th>
            <th>{{ coachStrings.$tr('lastActivityLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" person />
                {{ tableRow.name }}
              </KLabeledIcon>
            </td>
            <td>
              <StatusSimple :status="tableRow.statusObj.status" />
            </td>
            <td>
              <TimeDuration :seconds="tableRow.statusObj.time_spent" />
            </td>
            <td>
              <TruncatedItemList :items="tableRow.groups" />
            </td>
            <td>
              <ElapsedTime :date="tableRow.statusObj.last_activity" />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
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
            statusObj: this.getContentStatusObjForLearner(
              this.$route.params.resourceId,
              learner.id
            ),
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
