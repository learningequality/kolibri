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

      <CoreTable :emptyMessage="coachString('learnerListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('nameLabel') }}</th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ coachString('scoreLabel') }}</th>
            <th>{{ coachString('groupsLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon icon="person">
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
              <StatusSimple
                v-if="tableRow.statusObj.status !== STATUSES.started"
                :status="tableRow.statusObj.status"
              />
              <KLabeledIcon v-else>
                <KIcon slot="icon" :color="$themeTokens.progress" inProgress />
                {{
                  $tr('questionsCompletedRatioLabel',
                      {count: tableRow.statusObj.num_answered || 0, total: exam.question_count})
                }}
              </KLabeledIcon>
            </td>
            <td>
              <Score
                v-if="tableRow.statusObj.status === STATUSES.completed"
                :value="tableRow.statusObj.score || 0.0"
              />
            </td>
            <td>
              <TruncatedItemList :items="tableRow.groups" />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import commonCoach from '../common';
  import ReportsQuizHeader from './ReportsQuizHeader';

  export default {
    name: 'ReportsQuizLearnerListPage',
    components: {
      ReportsQuizHeader,
      KIcon,
      KLabeledIcon,
    },
    mixins: [commonCoach, commonCoreStrings, themeMixin],
    data() {
      return {
        filter: 'allQuizzes',
      };
    },
    computed: {
      filterOptions() {
        return [
          {
            label: this.coachString('allQuizzesLabel'),
            value: 'allQuizzes',
          },
          {
            label: this.coachString('activeQuizzesLabel'),
            value: 'activeQuizzes',
          },
          {
            label: this.coachString('inactiveQuizzesLabel'),
            value: 'inactiveQuizzes',
          },
        ];
      },
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      recipients() {
        return this.getLearnersForExam(this.exam);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = this._.sortBy(learners, ['name']);
        return sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            statusObj: this.getExamStatusObjForLearner(this.exam.id, learner.id),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    $trs: {
      averageScore: 'Average score: {score, number, percent}',
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
      questionsCompletedRatioLabel:
        '{count, number, integer} of {total, number, integer} {count, plural, other {completed}}',
    },
  };

</script>


<style lang="scss" scoped></style>
