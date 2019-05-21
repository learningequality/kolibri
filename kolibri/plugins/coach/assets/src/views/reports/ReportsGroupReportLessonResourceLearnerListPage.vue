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
          :to="classRoute('ReportsGroupReportLessonPage', {})"
          :text="$tr('back', { lesson: lesson.title })"
        />
      </p>
      <h1>
        <KLabeledIcon>
          <KBasicContentIcon slot="icon" :kind="resource.kind" />
          {{ resource.title }}
        </KLabeledIcon>
      </h1>

      <!-- TODO COACH
      <KButton :text="common$tr('previewAction')" />
      -->

      <HeaderTable>
        <HeaderTableRow>
          <template slot="key">
            {{ common$tr('avgTimeSpentLabel') }}
          </template>
          <template slot="value">
            <TimeDuration :seconds="360" />
          </template>
        </HeaderTableRow>
      </HeaderTable>

      <p>
        <StatusSummary :tally="tally" />
      </p>
      <CoreTable :emptyMessage="common$tr('activityListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ common$tr('nameLabel') }}</th>
            <th>{{ common$tr('statusLabel') }}</th>
            <th>{{ common$tr('timeSpentLabel') }}</th>
            <th>{{ common$tr('groupsLabel') }}</th>
            <th>{{ common$tr('lastActivityLabel') }}</th>
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
    name: 'ReportsGroupReportLessonResourceLearnerListPage',
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
        return this.getLearnersForGroups([this.$route.params.groupId]);
      },
      tally() {
        return this.getContentStatusTally(this.$route.params.resourceId, this.recipients);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = this._.sortBy(learners, ['name']);
        return sorted.map(learner => {
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
      },
    },
    $trs: {
      back: "Back to '{lesson}'",
      avgNumViews: 'Average number of views',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
