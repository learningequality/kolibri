<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <KGrid gutter="16">
      <KGridItem>
        <ReportsQuizHeader />
      </KGridItem>
      <KGridItem :layout12="{ span: 4 }">
        <QuizStatus />
      </KGridItem>
      <KGridItem :layout12="{ span: 8 }">
        <KPageContainer>
          <HeaderTabs>
            <HeaderTab
              :text="coachString('reportLabel')"
              :to="classRoute('ReportsQuizLearnerListPage')"
            />
            <HeaderTab
              :text="coachString('difficultQuestionsLabel')"
              :to="classRoute('ReportsQuizQuestionListPage')"
            />
          </HeaderTabs>
          <slot></slot>
        </KPageContainer>
      </KGridItem>
    </KGrid>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import ReportsQuizHeader from './ReportsQuizHeader';

  export default {
    name: 'ReportsQuizBaseListPage',
    components: {
      ReportsQuizHeader,
    },
    mixins: [commonCoach, commonCoreStrings],
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
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    $trs: {
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped></style>
