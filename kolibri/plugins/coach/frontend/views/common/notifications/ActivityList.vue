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
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
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
        return { last: LastPages.HOME_ACTIVITY };
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
          this.moreNotificationsForClass({}).then(moreResults => {
            this.moreResults = moreResults;
            this.loading = false;
          });
        }
      },
      notificationsFilter(notification) {
        if (notification.event === 'Answered') {
          return false;
        }
        return true;
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
