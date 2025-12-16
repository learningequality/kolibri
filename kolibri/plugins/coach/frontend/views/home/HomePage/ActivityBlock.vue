<template>

  <Block
    :allLinkText="coachString('viewAllAction')"
    :allLinkRoute="$router.getRoute('HomeActivityPage')"
    :showAllLink="notifications.length > 0"
  >
    <template #title>
      <KLabeledIcon :label="$tr('classActivityLabel')" />
    </template>

    <template #icon>
      <ContentIcon :kind="ContentNodeKinds.ACTIVITY" />
    </template>

    <p v-if="notifications.length === 0">
      {{ $tr('noActivityLabel') }}
    </p>

    <transition-group name="list">
      <BlockItem
        v-for="notification in notifications"
        :key="notification.groupCode + '_' + notification.id"
      >
        <NotificationCard
          :notification="notification"
          :lastQuery="lastQuery"
        />
      </BlockItem>
    </transition-group>
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
      classActivityLabel: {
        message: 'Class activity',
        context:
          "Refers to the section within the 'Class home' tab which provides real time notifications of what's happening with the learners in a class. \n\nCoaches can track learners' progress here.",
      },
      noActivityLabel: {
        message: 'No activity in your class',
        context:
          "Message that displays in the 'Class activity' section when there is no activity in that specific class.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../common/list-transition';

</style>
