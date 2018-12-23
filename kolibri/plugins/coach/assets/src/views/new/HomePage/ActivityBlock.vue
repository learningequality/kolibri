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

      <!-- Individual finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualFinished', {learnerName: "Adam", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualFinished', {learnerName: "Betsty", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('individualFinished', {learnerName: "Adam", itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('individualFinished', {learnerName: "Betsty", itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('individualFinished', {learnerName: "Carol", itemName: "A video assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('individualFinished', {learnerName: "Darren", itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('individualFinished', {learnerName: "Edward", itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('individualFinished', {learnerName: "Frank", itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Multiple finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('multipleFinished', {learnerName: "Adam", numOthers: 1, itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('multipleFinished', {learnerName: "Betsty", numOthers: 2, itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('multipleFinished', {learnerName: "Adam", numOthers: 3, itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('multipleFinished', {learnerName: "Betsty", numOthers: 4, itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('multipleFinished', {learnerName: "Carol", numOthers: 5, itemName: "A video assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('multipleFinished', {learnerName: "Darren", numOthers: 6, itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('multipleFinished', {learnerName: "Edward", numOthers: 7, itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('multipleFinished', {learnerName: "Frank", numOthers: 8, itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Whole group finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('wholeGroupFinished', {groupName: "Group A", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('wholeGroupFinished', {groupName: "Group A", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('wholeGroupFinished', {groupName: "Group A", itemName: "A video assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" learnerContext="Group A" contentContext="Some lesson">
        {{ nStrings.$tr('wholeGroupFinished', {groupName: "Group A", itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('wholeGroupFinished', {groupName: "Group A", itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('wholeGroupFinished', {groupName: "Group A", itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Whole class finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('wholeClassFinished', {className: "5th Grade", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('wholeClassFinished', {className: "5th Grade", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('wholeClassFinished', {className: "5th Grade", itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('wholeClassFinished', {className: "5th Grade", itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('wholeClassFinished', {className: "5th Grade", itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('wholeClassFinished', {className: "5th Grade", itemName: "Some quiz"}) }}
      </NotificationCard>


      <!-- Whole class finished - alternative -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('everyoneFinished', {itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('everyoneFinished', {itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('everyoneFinished', {itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('everyoneFinished', {itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some lesson">
        {{ nStrings.$tr('everyoneFinished', {itemName: "Some lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage" contentContext="Some quiz">
        {{ nStrings.$tr('everyoneFinished', {itemName: "Some quiz"}) }}
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

  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import NotificationCard from '../shared/notifications/NotificationCard';
  import { nStringsMixin } from '../shared/notifications/notificationStrings';

  export default {
    name: 'ActivityBlock',
    components: {
      KRouterLink,
      NotificationCard,
    },
    mixins: [nStringsMixin],
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
