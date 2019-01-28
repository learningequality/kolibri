<template>

  <Block
    :title="$tr('classActivity')"
    :allLinkText="$tr('viewAll')"
    :allLinkRoute="$router.getRoute('HomeActivityPage')"
  >
    <ContentIcon slot="icon" :kind="ContentNodeKinds.ACTIVITY" />
    <transition-group name="list">
      <NotificationCard
        v-for="notification in notifications"
        :key="notification.groupCode + '_' + notification.lastId"
        v-bind="cardPropsForNotification(notification)"
        class="block-item"
      >
        {{ cardTextForNotification(notification) }}
      </NotificationCard>
    </transition-group>
    <div v-if="notifications.length === 0">
      {{ $tr('noActivity') }}
    </div>
  </Block>

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
  import { notificationLink } from '../../../modules/coachNotifications/gettersUtils';
  import Block from './Block';

  const { LESSON, QUIZ } = NotificationObjects;
  const { COMPLETED, STARTED, HELP_NEEDED } = NotificationEvents;

  export default {
    name: 'ActivityBlock',
    components: {
      NotificationCard,
      Block,
    },
    mixins: [nStringsMixin, commonCoach],
    computed: {
      ...mapGetters('coachNotifications', ['summarizedNotifications']),
      notifications() {
        return orderBy(this.summarizedNotifications, 'lastTimestamp', ['desc']);
      },
    },
    methods: {
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

        return {
          icon,
          contentIcon,
          targetPage: notificationLink(notification),
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

  @import '../../common/list-transition';

</style>
