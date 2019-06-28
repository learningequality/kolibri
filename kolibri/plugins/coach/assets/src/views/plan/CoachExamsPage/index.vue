<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <PlanHeader />

      <div class="filter-and-button">
        <KSelect
          v-model="statusSelected"
          :label="coreCommon$tr('showAction')"
          :options="statusOptions"
          :inline="true"
        />
        <KRouterLink
          :primary="true"
          appearance="raised-button"
          :to="newExamRoute"
          :text="coachCommon$tr('newQuizAction')"
        />
      </div>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>{{ coachCommon$tr('titleLabel') }}</th>
            <th>{{ coachCommon$tr('recipientsLabel') }}</th>
            <th>
              {{ coachCommon$tr('statusLabel') }}
            </th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr
            v-for="exam in filteredExams"
            :key="exam.id"
          >
            <td>
              <KLabeledIcon icon="quiz">
                <KRouterLink
                  :to="$router.getRoute('QuizSummaryPage', { quizId: exam.id })"
                  appearance="basic-link"
                  :text="exam.title"
                />
              </KLabeledIcon>
            </td>

            <td>
              <Recipients
                :groupNames="getGroupNames(exam.groups)"
                :hasAssignments="exam.assignments.length > 0"
              />
            </td>

            <td>
              <QuizActive :active="exam.active" />
            </td>

          </tr>
        </transition-group>
      </CoreTable>

      <p v-if="!exams.length">
        {{ $tr('noExams') }}
      </p>
      <p
        v-else-if="statusSelected.value === coachCommon$tr('activeQuizzesLabel') &&
          !activeExams.length"
      >
        {{ $tr('noActiveExams') }}
      </p>
      <p
        v-else-if=" statusSelected.value === coachCommon$tr('inactiveQuizzesLabel') &&
          !inactiveExams.length"
      >
        {{ $tr('noInactiveExams') }}
      </p>
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../../../constants';
  import commonCoach from '../../common';
  import PlanHeader from '../../plan/PlanHeader';
  import QuizActive from '../../common/QuizActive';

  export default {
    name: 'CoachExamsPage',
    metaInfo() {
      return {
        title: this.coreCommon$tr('quizzesLabel'),
      };
    },
    components: {
      PlanHeader,
      CoreTable,
      KRouterLink,
      KSelect,
      QuizActive,
      KLabeledIcon,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        statusSelected: {
          label: this.coachCommon$tr('allQuizzesLabel'),
          value: this.coachCommon$tr('allQuizzesLabel'),
        },
      };
    },
    computed: {
      sortedExams() {
        return this.exams.slice().reverse();
      },
      statusOptions() {
        return [
          {
            label: this.coachCommon$tr('allQuizzesLabel'),
            value: this.coachCommon$tr('allQuizzesLabel'),
          },
          {
            label: this.coachCommon$tr('activeQuizzesLabel'),
            value: this.coachCommon$tr('activeQuizzesLabel'),
          },
          {
            label: this.coachCommon$tr('inactiveQuizzesLabel'),
            value: this.coachCommon$tr('inactiveQuizzesLabel'),
          },
        ];
      },
      activeExams() {
        return this.sortedExams.filter(exam => exam.active === true);
      },
      inactiveExams() {
        return this.sortedExams.filter(exam => exam.active === false);
      },
      filteredExams() {
        const filter = this.statusSelected.label;
        if (filter === this.coachCommon$tr('activeQuizzesLabel')) {
          return this.activeExams;
        } else if (filter === this.coachCommon$tr('inactiveQuizzesLabel')) {
          return this.inactiveExams;
        }
        return this.sortedExams;
      },
      newExamRoute() {
        return { name: PageNames.EXAM_CREATION_ROOT };
      },
    },
    $trs: {
      noExams: 'You do not have any quizzes',
      noActiveExams: 'No active quizzes',
      noInactiveExams: 'No inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped>

  .filter-and-button {
    display: flex;
    flex-wrap: wrap-reverse;
    justify-content: space-between;
    button {
      align-self: flex-end;
    }
  }

  .center-text {
    text-align: center;
  }

</style>
