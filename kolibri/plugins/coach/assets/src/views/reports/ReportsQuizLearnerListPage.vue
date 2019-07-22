<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsQuizHeader />

      <KCheckbox
        :label="coachStrings.$tr('onlyActiveLearnersLabel')"
        :checked="showOnlyActive"
        @change="showOnlyActive = !showOnlyActive"
      />

      <CoreTable :emptyMessage="coachStrings.$tr('learnerListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachStrings.$tr('nameLabel') }}</th>
            <th>{{ coachStrings.$tr('progressLabel') }}</th>
            <th>{{ coachStrings.$tr('scoreLabel') }}</th>
            <th>{{ coachStrings.$tr('groupsLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" person />
                <KRouterLink
                  v-if="tableRow.statusObj.status !== STATUSES.notStarted"
                  :text="tableRow.name"
                  :to="classRoute('ReportsQuizLearnerPage', {
                    learnerId: tableRow.id,
                    questionId: 0,
                    interactionIndex: 0
                  })"
                />
                <template v-else>
                  {{ tableRow.name }}
                </template>
              </KLabeledIcon>
            </td>
            <td>
              <StatusSimple :status="tableRow.statusObj.status" />
            </td>
            <td><Score :value="tableRow.statusObj.score" /></td>
            <td><TruncatedItemList :items="tableRow.groups" /></td>
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
  import ReportsQuizHeader from './ReportsQuizHeader';

  export default {
    name: 'ReportsQuizLearnerListPage',
    components: {
      ReportsQuizHeader,
      KCheckbox,
    },
    mixins: [commonCoach],
    data() {
      return {
        filter: 'allQuizzes',
        showOnlyActive: false,
      };
    },
    computed: {
      filterOptions() {
        return [
          {
            label: this.$tr('allQuizzes'),
            value: 'allQuizzes',
          },
          {
            label: this.$tr('activeQuizzes'),
            value: 'activeQuizzes',
          },
          {
            label: this.$tr('inactiveQuizzes'),
            value: 'inactiveQuizzes',
          },
        ];
      },
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      recipients() {
        return this.getLearnersForGroups(this.exam.groups);
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
            statusObj: this.getExamStatusObjForLearner(this.exam.id, learner.id),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
        return mapped;
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    methods: {
      active(learner) {
        return this.activeLearners.includes(learner.id);
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
      averageScore: 'Average score: {score, number, percent}',
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped></style>
