<template>

  <Block
    :allLinkText="$tr('viewAll')"
    :allLinkRoute="$router.getRoute('HomeActivityPage')"
  >
    <template slot="title">
      {{ $tr('classActivity') }}
    </template>

    <ContentIcon slot="icon" :kind="ContentNodeKinds.ACTIVITY" />
    <transition-group name="list">
      <BlockItem
        v-for="notification in notifications"
        :key="notification.groupCode + '_' + notification.lastId"
      >
        <NotificationCard
          v-bind="cardPropsForNotification(notification)"
          :linkText="cardTextForNotification(notification)"
        />
      </BlockItem>
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
  import { CollectionTypes } from '../../../constants/lessonsConstants';
  import { notificationLink } from '../../../modules/coachNotifications/gettersUtils';
  import Block from './Block';
  import BlockItem from './BlockItem';

  const MAX_NOTIFICATIONS = 10;

  export default {
    name: 'ActivityBlock',
    components: {
      NotificationCard,
      Block,
      BlockItem,
    },
    mixins: [nStringsMixin, commonCoach],
    computed: {
      ...mapGetters('coachNotifications', ['summarizedNotifications']),
      notifications() {
        return orderBy(this.summarizedNotifications, ({ lastId }) => Number(lastId), [
          'desc',
        ]).slice(0, MAX_NOTIFICATIONS);
      },
    },
    methods: {
      cardPropsForNotification(notification) {
        const { collection } = notification;
        const learnerContext =
          collection.type === CollectionTypes.LEARNERGROUP ? collection.name : '';
        return {
          eventType: notification.event,
          objectType: notification.object,
          resourceType: notification.resource.type,
          targetPage: {
            ...notificationLink(notification),
            query: {
              last: 'homepage',
            },
          },
          contentContext: notification.assignment.name,
          learnerContext,
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
