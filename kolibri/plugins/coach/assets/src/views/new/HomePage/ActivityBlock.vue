<template>

  <div>
    <h2>{{ $tr('classActivity') }}</h2>
    <p>
      <KRouterLink
        appearance="flat-button"
        :text="$tr('viewAll')"
        :to="{ name:'NEW_COACH_PAGES', params: {page: 'HomeActivityPage'} }"
      />
    </p>
    <div>

      <!--
  nStrings.$tr('individualFinished', {learnerName, itemName})
  nStrings.$tr('multipleFinished', {learnerName, numOthers, itemName})
  nStrings.$tr('wholeClassroomFinished', {classroomName, itemName})
  nStrings.$tr('wholeLearnerGroupFinished', {itemName})
  nStrings.$tr('individualNeedsHelp', {learnerName, itemName})
  nStrings.$tr('multipleNeedsHelp', {learnerName, numOthers, itemName})
 -->

      <!-- Individual finished -->
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualFinished', {learnerName: "Adam", itemName: "A video"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualFinished', {learnerName: "Betsty", itemName: "An exercise"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualFinished', {learnerName: "Adam", itemName: "A video assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualFinished', {learnerName: "Betsty", itemName: "An exercise assigned to the class"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualFinished', {learnerName: "Carol", itemName: "A video assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualFinished', {learnerName: "Darren", itemName: "An exercise assigned to a group"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualFinished', {learnerName: "Edward", itemName: "A lesson"}) }}
      </NotificationCard>
      <NotificationCard targetPage="SomePage">
        {{ nStrings.$tr('individualFinished', {learnerName: "Frank", itemName: "A quiz"}) }}
      </NotificationCard>

      <!-- Multiple finished -->

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
