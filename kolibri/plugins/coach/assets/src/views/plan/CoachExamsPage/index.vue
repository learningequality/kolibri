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
          :label="common$tr('showAction')"
          :options="statusOptions"
          :inline="true"
        />
        <KRouterLink
          :primary="true"
          appearance="raised-button"
          :to="newExamRoute"
          :text="common$tr('newQuizAction')"
        />
      </div>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>{{ common$tr('titleLabel') }}</th>
            <th>{{ common$tr('recipientsLabel') }}</th>
            <th>
              {{ common$tr('statusLabel') }}
            </th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr
            v-for="exam in filteredExams"
            :key="exam.id"
          >
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" quiz />
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
      <p v-else-if="statusSelected.value === $tr('activeExams') && !activeExams.length">
        {{ $tr('noActiveExams') }}
      </p>
      <p v-else-if=" statusSelected.value === $tr('inactiveExams') && !inactiveExams.length">
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
  import { PageNames } from '../../../constants';
  import commonCoach from '../../common';
  import PlanHeader from '../../plan/PlanHeader';
  import QuizActive from '../../common/QuizActive';

  export default {
    name: 'CoachExamsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      PlanHeader,
      CoreTable,
      KRouterLink,
      KSelect,
      QuizActive,
      KLabeledIcon,
      KIcon,
    },
    mixins: [commonCoach],
    data() {
      return {
        statusSelected: { label: this.$tr('allExams'), value: this.$tr('allExams') },
      };
    },
    computed: {
      sortedExams() {
        return this.exams.slice().reverse();
      },
      statusOptions() {
        return [
          { label: this.$tr('allExams'), value: this.$tr('allExams') },
          { label: this.$tr('activeExams'), value: this.$tr('activeExams') },
          { label: this.$tr('inactiveExams'), value: this.$tr('inactiveExams') },
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
        if (filter === this.$tr('activeExams')) {
          return this.activeExams;
        } else if (filter === this.$tr('inactiveExams')) {
          return this.inactiveExams;
        }
        return this.sortedExams;
      },
      newExamRoute() {
        return { name: PageNames.EXAM_CREATION_ROOT };
      },
    },
    methods: {
      genRecipientsString(groups) {
        if (!groups.length) {
          return this.common$tr('entireClassLabel');
        } else {
          return this.common$tr('numberOfGroups', { value: groups.length });
        }
      },
    },
    $trs: {
      allExams: 'All quizzes',
      activeExams: 'Active quizzes',
      inactiveExams: 'Inactive quizzes',
      noExams: 'You do not have any quizzes',
      noActiveExams: 'No active quizzes',
      noInactiveExams: 'No inactive quizzes',
      documentTitle: 'Quizzes',
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
