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

  const NotificationObjects = {
    RESOURCE: 'Resource',
    LESSON: 'Lesson',
    QUIZ: 'Quiz',
  };

  const NotificationEvents = {
    COMPLETED: 'Completed',
    HELP_NEEDED: 'HelpNeeded',
    STARTED: 'Started',
  };

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
      this.fetchNotificationsForClass(this.$route.params.classId);
    },
    methods: {
      ...mapActions('coachNotifications', ['fetchNotificationsForClass']),
      cardPropsForNotification(notification) {
        let icon = '';
        let contentIcon = '';
        const { event, collection, assignment, object, resource } = notification;
        // Notification needs to have the object type to determine targetPage
        icon = {
          Completed: 'star',
          Started: 'clock',
          HelpNeeded: 'help',
        }[event];

        const learnerContext = collection.type === 'learnergroup' ? collection.name : '';

        if (object === NotificationObjects.LESSON || object === NotificationObjects.QUIZ) {
          contentIcon = assignment.type;
        } else {
          contentIcon = resource.type;
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

        if (object === NotificationObjects.RESOURCE) {
          stringDetails.itemName = resource.name;
        }

        if (object === NotificationObjects.LESSON || object === NotificationObjects.QUIZ) {
          stringDetails.itemName = notification.assignment.name;
        }

        if (event === NotificationEvents.COMPLETED || event === NotificationEvents.STARTED) {
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

        if (event === NotificationEvents.HELP_NEEDED) {
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
