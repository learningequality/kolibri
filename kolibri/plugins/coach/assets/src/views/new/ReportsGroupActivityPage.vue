<template>

  <div class="new-coach-block">

    <ReportsGroupHeader />
    <NotificationsFilter />
    <br>

    <KGrid class="table-head">
      <KGridItem :size="75" percentage>
        {{ coachStrings.$tr('activityLabel') }}
      </KGridItem>
      <KGridItem :size="25" percentage>
        {{ coachStrings.$tr('timeLabel') }}
      </KGridItem>
    </KGrid>
    <div>

      <NotificationCard
        targetPage="SomePage"
        time="1 minutes ago"
      >
        {{ nStrings.$tr('individualCompleted', {learnerName: "Julie", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard
        targetPage="SomePage"
        time="2 minutes ago"
      >
        {{ nStrings.$tr('individualStarted', {learnerName: "John", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard
        targetPage="SomePage"
        time="3 minutes ago"
      >
        {{ nStrings.$tr('individualCompleted', {learnerName: "Steve", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard
        targetPage="SomePage"
        time="4 minutes ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {learnerName: "Mary", itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard
        targetPage="SomePage"
        time="6 minutes ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {learnerName: "John", itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard
        targetPage="SomePage"
        time="8 minutes ago"
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {learnerName: "Mary", itemName: "A video assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard
        targetPage="SomePage"
        time="10 minutes ago"
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {learnerName: "Steve", itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard
        targetPage="SomePage"
        time="15 minutes ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {learnerName: "Frank", itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard
        targetPage="SomePage"
        time="20 minutes ago"
        contentContext="Some quiz"
      >
        {{ nStrings.$tr('individualCompleted', {learnerName: "Julie", itemName: "Some quiz"}) }}
      </NotificationCard>
      <NotificationCard
        targetPage="SomePage"
        time="50 minutes ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualStarted', {learnerName: "Sam", itemName: "Some quiz"}) }}
      </NotificationCard>
    </div>

    <KButton
      :text="coachStrings.$tr('showMoreAction')"
    />

  </div>

</template>


<script>

  import imports from './imports';
  import ReportsGroupHeader from './ReportsGroupHeader';
  import NotificationCard from './shared/notifications/NotificationCard';
  import { nStringsMixin } from './shared/notifications/notificationStrings';
  import NotificationsFilter from './shared/notifications/NotificationsFilter';

  export default {
    name: 'ReportsGroupActivityPage',
    components: {
      NotificationsFilter,
      ReportsGroupHeader,
      NotificationCard,
    },
    mixins: [imports, nStringsMixin],
    $trs: {
      resourceTitleLabel: 'Resource title',
    },
  };

</script>


<style lang="scss" scoped></style>
