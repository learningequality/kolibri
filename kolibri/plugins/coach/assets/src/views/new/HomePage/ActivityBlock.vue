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
      <div v-if="notifications.length === 0">
        {{ $tr('noActivity') }}
      </div>
    </div>
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import orderBy from 'lodash/orderBy';
  import imports from '../imports';
  import NotificationCard from '../shared/notifications/NotificationCard';
  import { nStringsMixin } from '../shared/notifications/notificationStrings';
  import {
    NotificationObjects,
    NotificationEvents,
  } from '../../../constants/notificationsConstants';
  import { CollectionTypes } from '../../../constants/lessonsConstants';

  const { LESSON, RESOURCE, QUIZ } = NotificationObjects;
  const { COMPLETED, STARTED, HELP_NEEDED } = NotificationEvents;

  export default {
    name: 'ActivityBlock',
    components: {
      NotificationCard,
    },
    mixins: [nStringsMixin, imports],
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
          [COMPLETED]: 'star',
          [STARTED]: 'clock',
          [HELP_NEEDED]: 'help',
        }[event];

        const learnerContext =
          collection.type === CollectionTypes.LEARNERGROUP ? collection.name : '';

        if (object === LESSON || object === QUIZ) {
          contentIcon = assignment.type;
        } else {
          contentIcon = resource.type;
        }

        let targetPage = 'ReportsLessonExerciseLearnerListPage';

        return {
          icon,
          contentIcon,
          targetPage,
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

        if (object === RESOURCE) {
          stringDetails.itemName = resource.name;
        }

        if (object === LESSON || object === QUIZ) {
          stringDetails.itemName = notification.assignment.name;
        }

        if (event === COMPLETED || event === STARTED) {
          if (learnerSummary.completesCollection) {
            if (collection.type === CollectionTypes.CLASSROOM) {
              // When concatenated, should match the keys in 'nStrings' (e.g. 'wholeClassCompleted')
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

        if (event === HELP_NEEDED) {
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
