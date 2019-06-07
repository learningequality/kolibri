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
      <h1>
        <KLabeledIcon>
          <KBasicContentIcon slot="icon" :kind="resource.kind" />
          {{ resource.title }}
        </KLabeledIcon>
      </h1>
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

      <KCheckbox
        :label="coachStrings.$tr('onlyActiveLearnersLabel')"
        :checked="showOnlyActive"
        @change="showOnlyActive = !showOnlyActive"
      />

      <CoreTable :emptyMessage="coachStrings.$tr('activityListEmptyState')">
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

  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import { localeCompare } from 'kolibri.utils.i18n';
  import commonCoach from '../common';

  export default {
    name: 'ReportsLessonResourceLearnerListPage',
    components: {
      KCheckbox,
    },
    mixins: [commonCoach],
    data() {
      return {
        showOnlyActive: false,
      };
    },
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
        let learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);

        if (this.showOnlyActive === true) {
          learners = this.filterByActive(learners);
        }

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
    methods: {
      active(learner) {
        return this.activeLearners.includes(learner.username);
      },
      filterByActive(learners) {
        const sortByKey = 'username';
        const predicate = learner => this.active(learner);
        return learners.filter(predicate).sort((a, b) => {
          return localeCompare(a[sortByKey], b[sortByKey]);
        });
      },
    },
    $trs: {
      back: "Back to '{lesson}'",
      avgNumViews: 'Average number of views',
    },
  };

</script>


<style lang="scss" scoped></style>
