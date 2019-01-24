<template>

  <div>
    <!-- <button @click="moveNots">Move</button> -->
    <h2>{{ $tr('classActivity') }}</h2>
    <p>
      <KRouterLink
        appearance="flat-button"
        :text="$tr('viewAll')"
        :to="$router.getRoute('HomeActivityPage')"
      />
    </p>
    <div>
      <transition-group name="list">
        <NotificationCard
          v-for="notification in notifications"
          :key="notification.groupCode + String(notification.lastTimestamp)"
          v-bind="cardPropsForNotification(notification)"
        >
          {{ cardTextForNotification(notification) }}
        </NotificationCard>

      </transition-group>
      <div v-if="notifications.length === 0">
        {{ $tr('noActivity') }}
      </div>
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import orderBy from 'lodash/orderBy';
  import commonCoach from '../../common';
  import NotificationCard from '../../common/notifications/NotificationCard';
  import { nStringsMixin } from '../../common/notifications/notificationStrings';
  import {
    NotificationObjects,
    NotificationEvents,
  } from '../../../constants/notificationsConstants';
  import { CollectionTypes } from '../../../constants/lessonsConstants';

  const { LESSON, QUIZ } = NotificationObjects;
  const { COMPLETED, STARTED, HELP_NEEDED } = NotificationEvents;

  export default {
    name: 'ActivityBlock',
    components: {
      NotificationCard,
    },
    mixins: [nStringsMixin, commonCoach],
    computed: {
      ...mapGetters('coachNotifications', ['summarizedNotifications']),
      notifications() {
        return orderBy(this.summarizedNotifications, 'lastTimestamp', ['desc']);
      },
    },
    methods: {
      moveNots() {
        this.$store.commit('coachNotifications/TEST_MOVE_LAST');
      },
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
          lastTimestamp: String(notification.lastTimestamp),
        };
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


<style lang="scss" scoped>

  $time: 0.25s;

  .list-move {
    transition: transform $time;
  }

  .list-enter,
  .list-leave-to {
    opacity: 0;
  }

  .list-leave,
  .list-enter-to {
    opacity: 1;
  }

  .list-enter-active {
    transition: opacity $time;
    transition-timing-function: ease-in;
  }

  .list-leave-active {
    transition: all $time;
    transition-timing-function: ease-out;
  }

</style>
