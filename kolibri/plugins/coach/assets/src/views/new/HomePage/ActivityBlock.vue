<template>

  <div>
    <h2>{{ $tr('classActivity') }}</h2>
    <p>
      <KRouterLink
        appearance="flat-button"
        :text="$tr('viewAll')"
        :to="newCoachRoute('HomeActivityPage')"
      />
    </p>

    <div>

      <!-- Individual completed -->
      <NotificationCard
        icon="star"
      >
        {{ nStrings.$tr('individualCompleted', {learnerName: "Adam", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage="ReportsLessonExerciseLearnerListPage"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleCompleted', {
          learnerName: "Betsy",
          numOthers: 4,
          itemName: "Counting with big numbers"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="help"
        targetPage="ReportsLessonLearnerExercisePage"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualNeedsHelp', {
          learnerName: "Julie",
          itemName: "Counting with big numbers"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="clock"
      >
        {{ nStrings.$tr('individualStarted', {
          learnerName: "Adam",
          itemName: "A video"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="clock"
        targetPage="ReportsLessonLearnerListPage"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleStarted', {
          learnerName: "Edward",
          numOthers: 6,
          itemName: "Some lesson"
        }) }}
      </NotificationCard>










      <!-- One of every kind of notification type below --

      <NotificationCard
        icon="star"
        targetPage="ReportsLessonResourceLearnerListPage"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Adam",
          itemName: "A video assigned to the class"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage="ReportsLessonExerciseLearnerPage"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Betsy",
          itemName: "An exercise assigned to the class"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage="ReportsGroupReportLessonResourceLearnerListPage"
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Carol",
          itemName: "A video assigned to a group"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage="ReportsGroupReportLessonExerciseLearnerPage"
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Darren",
          itemName: "An exercise assigned to a group"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage="ReportsLessonLearnerPage"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Edward",
          itemName: "Some lesson"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage="ReportsQuizLearnerPage"
        contentContext="Some quiz"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Frank",
          itemName: "Some quiz"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="clock"
        targetPage="ReportsLearnerActivityExercisePage"
      >
        {{ nStrings.$tr('individualStarted', {
          learnerName: "Betsy",
          itemName: "An exercise"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
      >
        {{ nStrings.$tr('multipleCompleted', {
          learnerName: "Adam",
          numOthers: 1,
          itemName: "A video"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
      >
        {{ nStrings.$tr('multipleCompleted', {
          learnerName: "Betsy",
          numOthers: 2,
          itemName: "An exercise"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleCompleted', {
          learnerName: "Adam",
          numOthers: 3,
          itemName: "A video assigned to the class"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="star"
        targetPage=""
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleCompleted', {
          learnerName: "Carol",
          numOthers: 5,
          itemName: "A video assigned to a group"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleCompleted', {
          learnerName: "Darren", numOthers: 6, itemName: "An exercise assigned to a group"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleCompleted', {
          learnerName: "Edward", numOthers: 7, itemName: "Some lesson"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        contentContext="Some quiz"
      >
        {{ nStrings.$tr('multipleCompleted', {
          learnerName: "Frank", numOthers: 8, itemName: "Some quiz"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="clock"
        targetPage=""
      >
        {{ nStrings.$tr('multipleStarted', {
          learnerName: "Adam", numOthers: 1, itemName: "A video"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="clock"
        targetPage=""
      >
        {{ nStrings.$tr('multipleStarted', {
          learnerName: "Betsy", numOthers: 2, itemName: "An exercise"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="clock"
        targetPage=""
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleStarted', {
          learnerName: "Adam", numOthers: 3, itemName: "A video assigned to the class"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="clock"
        targetPage=""
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleStarted', {
          learnerName: "Betsy", numOthers: 4, itemName: "An exercise assigned to the class"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="clock"
        targetPage=""
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleStarted', {
          learnerName: "Carol", numOthers: 5, itemName: "A video assigned to a group"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="clock"
        targetPage=""
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleStarted', {
          learnerName: "Darren", numOthers: 6, itemName: "An exercise assigned to a group"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="clock"
        targetPage=""
        contentContext="Some quiz"
      >
        {{ nStrings.$tr('multipleStarted', {
          learnerName: "Frank", numOthers: 8, itemName: "Some quiz"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
      >
        {{ nStrings.$tr('wholeGroupCompleted', {
          groupName: "Group A", itemName: "A video"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
      >
        {{ nStrings.$tr('wholeGroupCompleted', {
          groupName: "Group A", itemName: "An exercise"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('wholeGroupCompleted', {
          groupName: "Group A", itemName: "A video assigned to a group"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('wholeGroupCompleted', {
          groupName: "Group A", itemName: "An exercise assigned to a group"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('wholeGroupCompleted', {
          groupName: "Group A", itemName: "Some lesson"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        contentContext="Some quiz"
      >
        {{ nStrings.$tr('wholeGroupCompleted', {
          groupName: "Group A", itemName: "Some quiz"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
      >
        {{ nStrings.$tr('everyoneCompleted', {itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
      >
        {{ nStrings.$tr('everyoneCompleted', {itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('everyoneCompleted', {itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('everyoneCompleted', {itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('everyoneCompleted', {itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard
        icon="star"
        targetPage=""
        contentContext="Some quiz"
      >
        {{ nStrings.$tr('everyoneCompleted', {itemName: "Some quiz"}) }}
      </NotificationCard>
      <NotificationCard
        icon="help"
        targetPage=""
      >
        {{ nStrings.$tr('individualNeedsHelp', {learnerName: "Betsy", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard
        icon="help"
        targetPage=""
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualNeedsHelp', {
          learnerName: "Betsy", itemName: "An exercise assigned to the class"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="help"
        targetPage=""
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualNeedsHelp', {
          learnerName: "Darren", itemName: "An exercise assigned to a group"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="help"
        targetPage=""
      >
        {{ nStrings.$tr('multipleNeedHelp', {
          learnerName: "Betsy", numOthers: 1, itemName: "An exercise"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="help"
        targetPage=""
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleNeedHelp', {
          learnerName: "Betsy", numOthers: 2, itemName: "An exercise assigned to the class"
        }) }}
      </NotificationCard>
      <NotificationCard
        icon="help"
        targetPage=""
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('multipleNeedHelp', {
          learnerName: "Darren", numOthers: 3, itemName: "An exercise assigned to a group"
        }) }}
      </NotificationCard>
      -->
    </div>
  </div>

</template>


<script>

  import imports from '../imports';
  import NotificationCard from '../shared/notifications/NotificationCard';
  import { nStringsMixin } from '../shared/notifications/notificationStrings';

  export default {
    name: 'ActivityBlock',
    components: {
      NotificationCard,
    },
    mixins: [nStringsMixin, imports],
    props: {},
    computed: {},
    methods: {},
    $trs: {
      classActivity: 'Class activity',
      recentActivity: 'Recent activity',
      recentClassActivity: 'Recent Class activity',
      noActivity: 'No activity in your class',
      viewAll: 'View all',
    },
  };

</script>


<style lang="scss" scoped></style>
