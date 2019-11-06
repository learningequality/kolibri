<template>

  <Block
    :allLinkText="coachString('viewAllAction')"
    :allLinkRoute="$router.getRoute('HomeActivityPage')"
    :showAllLink="notifications.length > 0"
  >
    <template slot="title">
      {{ $tr('classActivityLabel') }}
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
      {{ $tr('noActivityLabel') }}
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
  import { LastPages } from '../../../constants/lastPagesConstants';
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
        // Filter out "Answered" notifications to avoid flooding the list
        const filteredNotifications = this.summarizedNotifications.filter(
          n => n.event !== 'Answered'
        );
        return orderBy(filteredNotifications, ({ lastId }) => Number(lastId), ['desc']).slice(
          0,
          MAX_NOTIFICATIONS
        );
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
              last: LastPages.HOME_PAGE,
            },
          },
          contentContext: notification.assignment.name,
          learnerContext,
        };
      },
    },
    $trs: {
      classActivityLabel: 'Class activity',
      noActivityLabel: 'No activity in your class',
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../common/list-transition';

</style>
