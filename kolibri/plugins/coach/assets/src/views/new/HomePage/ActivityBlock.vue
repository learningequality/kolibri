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
      <NotificationCard
        v-for="(notification, idx) in notifications"
        :key="idx"
        v-bind="cardPropsForNotification(notification)"
      >
        {{ cardTextForNotification(notification) }}
      </NotificationCard>
    </div>
    <pre>
      {{ JSON.stringify(notifications, null, 2) }}
    </pre>

  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import orderBy from 'lodash/orderBy';
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
    computed: {
      ...mapGetters('coachNotifications', ['summarizedNotifications']),
      notifications() {
        return orderBy(this.summarizedNotifications, 'lastTimestamp', ['desc']);
      },
    },
    beforeMount() {
      this.fetchNotificationsForClass();
    },
    methods: {
      ...mapActions('coachNotifications', ['fetchNotificationsForClass']),
      cardPropsForNotification(notification) {
        let icon = '';
        let contentIcon = '';
        // Notification needs to have the object type to determine targetPage
        icon = {
          Completed: 'star',
          Started: 'clock',
          HelpNeeded: 'help',
        }[notification.event];

        const learnerContext =
          notification.collection.type === 'learnergroup' ? notification.collection.name : '';

        if (notification.object === 'Lesson' || notification.object === 'Quiz') {
          contentIcon = notification.assignment.type;
        } else {
          contentIcon = notification.resource.type;
        }

        return {
          icon,
          contentIcon,
          targetPage: 'ReportsLessonExerciseLearnerListPage',
          learnerContext,
          contentContext: notification.assignment.name,
        };
      },
      cardTextForNotification(notification) {
        const { collection, resource, learnerSummary, object, event } = notification;
        let stringType;
        let stringDetails = {
          learnerName: learnerSummary.firstUserName,
        };

        if (object === 'Resource') {
          stringDetails.itemName = resource.name;
        }

        if (object === 'Lesson' || object === 'Quiz') {
          stringDetails.itemName = notification.assignment.name;
        }

        if (event === 'Completed' || event === 'Started') {
          if (learnerSummary.completesCollection) {
            if (collection.type === 'classroom') {
              stringType = `wholeClass${event}`;
              stringDetails.className = collection.name;
            } else {
              stringType = `wholeGroup${event}`;
              stringDetails.groupName = collection.name;
            }
          } else {
            if (learnerSummary.total === 1) {
              stringType = `individual${event}`;
            } else {
              stringType = `multiple${event}`;
              stringDetails.numOthers = learnerSummary.total - 1;
            }
          }
        }

        if (event === 'HelpNeeded') {
          if (learnerSummary.total === 1) {
            stringType = 'individualNeedsHelp';
          } else {
            stringType = 'multipleNeedHelp';
            stringDetails.numOthers = learnerSummary.total - 1;
          }
        }

        return this.nStrings.$tr(stringType, stringDetails);
      },
    },
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
