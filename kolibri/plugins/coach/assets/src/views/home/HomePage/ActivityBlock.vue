<template>

  <Block
    :allLinkText="coachString('viewAllAction')"
    :allLinkRoute="$router.getRoute('HomeActivityPage')"
    :showAllLink="notifications.length > 0"
  >
    <template v-slot:title>
      {{ $tr('classActivityLabel') }}
    </template>

    <ContentIcon slot="icon" :kind="ContentNodeKinds.ACTIVITY" />
    <transition-group name="list">
      <BlockItem
        v-for="notification in notifications"
        :key="notification.groupCode + '_' + notification.lastId"
      >
        <NotificationCard
          :notification="notification"
          :lastQuery="lastQuery"
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
  import commonCoach from '../../common';
  import NotificationCard from '../../common/notifications/NotificationCard';
  import { nStringsMixin } from '../../common/notifications/notificationStrings';
  import { LastPages } from '../../../constants/lastPagesConstants';
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
        return this.summarizedNotifications.slice(0, MAX_NOTIFICATIONS);
      },
      lastQuery() {
        return {
          last: LastPages.HOME_PAGE,
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
