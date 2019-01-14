<template>

  <div class="new-coach-block">
    <p>
      <BackLink
        :to="newCoachRoute('HomePage')"
        :text="$tr('back')"
      />
    </p>
    <h2>{{ $tr('classActivity') }}</h2>
    <NotificationsFilter />
    <br>

    <div>
      <NotificationCard
        icon="star"
        time="1 minute ago"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Adam",
          itemName: "A video"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="star"
        targetPage=""
        time="2 minutes ago"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Betsy",
          itemName: "An exercise"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="star"
        targetPage=""
        time="3 minutes ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Adam",
          itemName: "A video assigned to the class"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="star"
        targetPage=""
        time="4 minutes ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Betsy",
          itemName: "An exercise assigned to the class"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="star"
        targetPage=""
        time="5 minutes ago"
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
        targetPage=""
        time="6 minutes ago"
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
        targetPage=""
        time="10 minutes ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Edward",
          itemName: "Some lesson"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="star"
        targetPage=""
        time="15 minutes ago"
        contentContext="Some quiz"
      >
        {{ nStrings.$tr('individualCompleted', {
          learnerName: "Frank",
          itemName: "Some quiz"
        }) }}
      </NotificationCard>





      <!-- Individual needs help -->
      <NotificationCard
        icon="help"
        targetPage=""
        time="20 minutes ago"
      >
        {{ nStrings.$tr('individualNeedsHelp', {
          learnerName: "Betsy",
          itemName: "An exercise"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="help"
        targetPage=""
        time="25 minutes ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualNeedsHelp', {
          learnerName: "Betsy",
          itemName: "An exercise assigned to the class"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="help"
        targetPage=""
        time="30 minutes ago"
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualNeedsHelp', {
          learnerName: "Darren",
          itemName: "An exercise assigned to a group"
        }) }}
      </NotificationCard>





      <!-- Individual started -->
      <NotificationCard
        icon="clock"
        targetPage=""
        time="40 minutes ago"
      >
        {{ nStrings.$tr('individualStarted', {learnerName: "Adam", itemName: "A video"}) }}
      </NotificationCard>

      <NotificationCard
        icon="clock"
        targetPage=""
        time="50 minutes ago"
      >
        {{ nStrings.$tr('individualStarted', {
          learnerName: "Betsy",
          itemName: "An exercise"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="clock"
        targetPage=""
        time="1 hour ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualStarted', {
          learnerName: "Adam",
          itemName: "A video assigned to the class"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="clock"
        targetPage=""
        time="1 hour ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualStarted', {
          learnerName: "Betsy",
          itemName: "An exercise assigned to the class"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="clock"
        targetPage=""
        time="1 hour ago"
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualStarted', {
          learnerName: "Carol",
          itemName: "A video assigned to a group"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="clock"
        targetPage=""
        time="2 hours ago"
        learnerContext="Group A"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualStarted', {
          learnerName: "Darren",
          itemName: "An exercise assigned to a group"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="clock"
        targetPage=""
        time="5 hours ago"
        contentContext="Some lesson"
      >
        {{ nStrings.$tr('individualStarted', {
          learnerName: "Edward",
          itemName: "Some lesson"
        }) }}
      </NotificationCard>

      <NotificationCard
        icon="clock"
        targetPage=""
        time="3 days ago"
        contentContext="Some quiz"
      >
        {{ nStrings.$tr('individualStarted', {
          learnerName: "Frank",
          itemName: "Some quiz"
        }) }}
      </NotificationCard>





    </div>

    <KButton
      :text="coachStrings.$tr('showMoreAction')"
    />

  </div>

</template>


<script>

  import imports from './imports';
  import NotificationsFilter from './shared/notifications/NotificationsFilter';

  import NotificationCard from './shared/notifications/NotificationCard';
  import { nStringsMixin } from './shared/notifications/notificationStrings';

  export default {
    name: 'HomeActivityPage',
    components: {
      NotificationsFilter,
      NotificationCard,
    },
    mixins: [imports, nStringsMixin],
    $trs: {
      back: 'Class home',
      classActivity: 'Class activity',
      noActivity: 'No activity in your class',
      viewMore: 'View more',
    },
  };

</script>


<style lang="scss" scoped></style>
