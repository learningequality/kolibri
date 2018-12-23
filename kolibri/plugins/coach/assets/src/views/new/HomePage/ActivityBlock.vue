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
      <div class="table-head">
        {{ coachStrings.$tr('activityLabel') }}
      </div>

      <!-- Individual finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualCompleted', {learnerName: "Adam", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualCompleted', {learnerName: "Betsty", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('individualCompleted', {learnerName: "Adam", itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('individualCompleted', {learnerName: "Betsty", itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('individualCompleted', {learnerName: "Carol", itemName: "A video assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('individualCompleted', {learnerName: "Darren", itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('individualCompleted', {learnerName: "Edward", itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('individualCompleted', {learnerName: "Frank", itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Individual finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualStarted', {learnerName: "Adam", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualStarted', {learnerName: "Betsty", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('individualStarted', {learnerName: "Adam", itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('individualStarted', {learnerName: "Betsty", itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('individualStarted', {learnerName: "Carol", itemName: "A video assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('individualStarted', {learnerName: "Darren", itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('individualStarted', {learnerName: "Edward", itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('individualStarted', {learnerName: "Frank", itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Multiple finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('multipleCompleted', {learnerName: "Adam", numOthers: 1, itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('multipleCompleted', {learnerName: "Betsty", numOthers: 2, itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('multipleCompleted', {learnerName: "Adam", numOthers: 3, itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('multipleCompleted', {learnerName: "Betsty", numOthers: 4, itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('multipleCompleted', {learnerName: "Carol", numOthers: 5, itemName: "A video assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('multipleCompleted', {learnerName: "Darren", numOthers: 6, itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('multipleCompleted', {learnerName: "Edward", numOthers: 7, itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('multipleCompleted', {learnerName: "Frank", numOthers: 8, itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Multiple finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('multipleStarted', {learnerName: "Adam", numOthers: 1, itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('multipleStarted', {learnerName: "Betsty", numOthers: 2, itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('multipleStarted', {learnerName: "Adam", numOthers: 3, itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('multipleStarted', {learnerName: "Betsty", numOthers: 4, itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('multipleStarted', {learnerName: "Carol", numOthers: 5, itemName: "A video assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('multipleStarted', {learnerName: "Darren", numOthers: 6, itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('multipleStarted', {learnerName: "Edward", numOthers: 7, itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('multipleStarted', {learnerName: "Frank", numOthers: 8, itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Whole group finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('wholeGroupCompleted', {groupName: "Group A", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('wholeGroupCompleted', {groupName: "Group A", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('wholeGroupCompleted', {groupName: "Group A", itemName: "A video assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('wholeGroupCompleted', {groupName: "Group A", itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('wholeGroupCompleted', {groupName: "Group A", itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('wholeGroupCompleted', {groupName: "Group A", itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Whole class finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('wholeClassCompleted', {className: "5th Grade", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('wholeClassCompleted', {className: "5th Grade", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('wholeClassCompleted', {className: "5th Grade", itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('wholeClassCompleted', {className: "5th Grade", itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('wholeClassCompleted', {className: "5th Grade", itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('wholeClassCompleted', {className: "5th Grade", itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Whole class finished - alternative -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('everyoneCompleted', {itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('everyoneCompleted', {itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('everyoneCompleted', {itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('everyoneCompleted', {itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('everyoneCompleted', {itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('everyoneCompleted', {itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Individual needs help -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualNeedsHelp', {learnerName: "Betsty", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('individualNeedsHelp', {learnerName: "Betsty", itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('individualNeedsHelp', {learnerName: "Darren", itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>


      <!-- Multiple need help -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('multipleNeedHelp', {learnerName: "Betsty", numOthers: 1, itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('multipleNeedHelp', {learnerName: "Betsty", numOthers: 2, itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('multipleNeedHelp', {learnerName: "Darren", numOthers: 3, itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>

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
      noActivity: 'No activity in your class',
      viewAll: 'View all',
    },
  };

</script>


<style lang="scss" scoped></style>
