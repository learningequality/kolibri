<template>

  <div>
    <NotificationsFilter
      v-show="!$isPrint"
      :resourceFilter.sync="resourceFilter"
      :progressFilter.sync="progressFilter"
      :enabledFilters="enabledFilters"
    />
    <br >

    <div class="notifications">
      <p v-if="!loading && notifications.length === 0">
        {{ noActivityString }}
      </p>

      <NotificationCard
        v-for="notification in notifications"
        v-show="showNotification(notification)"
        :key="notification.id"
        class="notification-card"
        :notification="notification"
        :lastQuery="backLinkQuery"
        :style="{ borderBottomColor: $themeTokens.fineLine }"
      />
    </div>

    <div
      v-if="noFiltersApplied"
      class="show-more"
    >
      <transition mode="out-in">
        <KLinearLoader
          v-if="loading"
          :delay="false"
        />
        <template v-else>
          <KButton
            v-if="moreResults"
            :text="coreString('showMoreAction')"
            @click="fetchMore"
          />
        </template>
      </transition>
    </div>
  </div>

</template>


<script>

  import uniq from 'lodash/uniq';
  import map from 'lodash/map';
  import { mapActions, mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { NotificationObjects } from '../../../constants/notificationsConstants';
  import { LastPages } from '../../../constants/lastPagesConstants';
  import NotificationCard from './NotificationCard';
  import NotificationsFilter from './NotificationsFilter';

  const { LESSON, QUIZ } = NotificationObjects;

  export default {
    name: 'ActivityList',
    components: {
      NotificationsFilter,
      NotificationCard,
    },
    mixins: [commonCoreStrings],
    props: {
      // String to display when there are no notifications
      noActivityString: {
        type: String,
        default: '',
      },
      // Name of embedded page to handle details like the back link query
      // and the incoming notifications filter
      embeddedPageName: {
        type: String,
        required: true,
        validator(value) {
          return [
            'HomeActivityPage',
            'ReportsLearnerActivityPage',
            'ReportsGroupActivityPage',
          ].includes(value);
        },
      },
    },
    data() {
      return {
        loading: true,
        moreResults: true,
        progressFilter: 'all',
        resourceFilter: 'all',
        filters: {
          ALL: 'all',
          LESSON: 'lesson',
          QUIZ: 'quiz',
        },
      };
    },
    computed: {
      ...mapGetters('coachNotifications', ['allNotifications']),
      notifications() {
        return this.allNotifications.filter(this.notificationsFilter);
      },
      noFiltersApplied() {
        return this.progressFilter === this.filters.ALL && this.resourceFilter === this.filters.ALL;
      },
      // Passed through to Notification Card links and used to correctly
      // handle exiting Exercise and Quiz detail pages.
      backLinkQuery() {
        switch (this.embeddedPageName) {
          case 'HomeActivityPage':
            return { last: LastPages.HOME_ACTIVITY };
          case 'ReportsLearnerActivityPage':
            return { last: LastPages.LEARNER_ACTIVITY, last_id: this.$route.params.learnerId };
          case 'ReportsGroupActivityPage':
            return { last: LastPages.GROUP_ACTIVITY, last_id: this.$route.params.groupId };
          default:
            return {};
        }
      },
      filterParam() {
        switch (this.embeddedPageName) {
          case 'ReportsLearnerActivityPage':
            return { learner_id: this.$route.params.learnerId };
          case 'ReportsGroupActivityPage':
            return { group_id: this.$route.params.groupId };
          default:
            return {};
        }
      },
      enabledFilters() {
        return {
          resource: [
            ...uniq(map(this.notifications, 'object')),
            ...uniq(map(this.notifications, 'resource.type')),
          ],
          progress: uniq(map(this.notifications, 'event')),
        };
      },
    },
    created() {
      this.fetchMore();
    },
    methods: {
      ...mapActions('coachNotifications', ['moreNotificationsForClass']),
      fetchMore() {
        if (this.moreResults) {
          this.loading = true;
          const params = {
            ...this.filterParam,
          };
          this.moreNotificationsForClass(params).then(moreResults => {
            this.moreResults = moreResults;
            this.loading = false;
          });
        }
      },
      // Filter incoming notifications according to the embedded page
      // For HomeActivityPage - no filter
      // For ReportsLearnerActivityPage - notification.user_id === current learnerId
      // For ReportsGroupActivityPage - notification.user_id in group.users
      notificationsFilter(notification) {
        if (notification.event === 'Answered') {
          return false;
        }
        if (this.embeddedPageName === 'HomeActivityPage') {
          return true;
        }
        if (this.embeddedPageName === 'ReportsLearnerActivityPage') {
          return notification.user_id === this.$route.params.learnerId;
        }
        if (this.embeddedPageName === 'ReportsGroupActivityPage') {
          return this.notificationBelongsToGroup(notification, this.$route.params.groupId);
        }
        return true;
      },
      notificationBelongsToGroup(notification, groupId) {
        return notification.assignment_collections.includes(groupId);
      },
      showNotification(notification) {
        if (this.noFiltersApplied) {
          return true;
        }
        let progressPasses = true;
        let resourcePasses = true;
        if (this.progressFilter !== this.filters.ALL) {
          progressPasses = notification.event === this.progressFilter;
        }
        if (this.resourceFilter !== this.filters.ALL) {
          if (this.resourceFilter === this.filters.LESSON) {
            resourcePasses = notification.object === LESSON;
          } else if (this.resourceFilter === this.filters.QUIZ) {
            resourcePasses = notification.object === QUIZ;
          } else {
            resourcePasses = notification.resource.type === this.resourceFilter;
          }
        }
        return progressPasses && resourcePasses;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .show-more {
    height: 100px;
  }

  // Copied from BlockItem.vue
  .notification-card {
    padding-bottom: 16px;
    border-bottom-style: none;
    border-bottom-width: 0;

    &:not(:last-child) {
      border-bottom-style: solid;
      border-bottom-width: 1px;
    }
  }

</style>
