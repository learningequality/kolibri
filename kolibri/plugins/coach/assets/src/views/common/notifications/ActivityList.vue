<template>

  <div>
    <NotificationsFilter
      v-show="!$isPrint"
      :resourceFilter.sync="resourceFilter"
      :progressFilter.sync="progressFilter"
      :enabledFilters="enabledFilters"
    />
    <br>

    <div class="notifications">
      <p v-if="!loading && nextPage === 2 && notifications.length === 0">
        {{ noActivityString }}
      </p>

      <NotificationCard
        v-for="notification in notifications"
        v-show="showNotification(notification)"
        :key="notification.id"
        class="notification-card"
        v-bind="cardPropsForNotification(notification)"
        :linkText="cardTextForNotification(notification)"
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
            :text="coachString('showMoreAction')"
            @click="fetchNotifications"
          />
        </template>
      </transition>
    </div>
  </div>

</template>


<script>

  import find from 'lodash/find';
  import maxBy from 'lodash/maxBy';
  import get from 'lodash/get';
  import uniq from 'lodash/uniq';
  import map from 'lodash/map';
  import { mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { cardTextForNotification } from '../notifications/notificationStrings';
  import notificationsResource from '../../../apiResources/notifications';
  import { NotificationObjects } from '../../../constants/notificationsConstants';
  import { CollectionTypes } from '../../../constants/lessonsConstants';
  import { LastPages } from '../../../constants/lastPagesConstants';
  import { notificationLink } from '../../../modules/coachNotifications/gettersUtils';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import NotificationCard from './NotificationCard';
  import NotificationsFilter from './NotificationsFilter';

  const { LESSON, RESOURCE, QUIZ } = NotificationObjects;

  export default {
    name: 'ActivityList',
    components: {
      NotificationsFilter,
      NotificationCard,
    },
    mixins: [coachStringsMixin],
    props: {
      // getParams for NotificationsResource.fetchCollection
      notificationParams: {
        type: Object,
        required: true,
      },
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
        nextPage: 1,
        progressFilter: 'all',
        resourceFilter: 'all',
        notifications: [],
        filters: {
          ALL: 'all',
          LESSON: 'lesson',
          QUIZ: 'quiz',
        },
      };
    },
    computed: {
      ...mapState('coachNotifications', {
        allNotifications: 'notifications',
      }),
      ...mapState('classSummary', ['examMap', 'lessonMap', 'groupMap', 'contentNodeMap']),
      ...mapState('classSummary', {
        classId: 'id',
        className: 'name',
      }),
      noFiltersApplied() {
        return this.progressFilter === this.filters.ALL && this.resourceFilter === this.filters.ALL;
      },
      lastNotificationId() {
        if (this.notifications.length > 0) {
          return Number(maxBy(this.notifications, n => Number(n.id)).id);
        }
        return 0;
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
    watch: {
      allNotifications(newVal) {
        const newNotifications = newVal.filter(
          n => Number(n.id) > this.lastNotificationId && this.newNotificationsFilter(n)
        );
        this.notifications = [
          ...newNotifications.map(this.reshapeNotification),
          ...this.notifications,
        ];
      },
    },
    beforeMount() {
      this.fetchNotifications();
    },
    methods: {
      cardTextForNotification,
      notificationLink,
      fetchNotifications() {
        this.loading = true;
        return notificationsResource
          .fetchCollection({
            getParams: {
              ...this.notificationParams,
              page_size: 10,
              page: this.nextPage,
            },
            force: true,
          })
          .then(data => {
            this.notifications = [
              ...this.notifications,
              ...data.results
                .filter(n => {
                  // 'Answered' event types should not show up in the notifications
                  // because it would add a ton of meaningless events.
                  return n.event !== 'Answered';
                })
                .map(this.reshapeNotification)
                .filter(Boolean),
            ];
            this.moreResults = data.next !== null;
            this.nextPage = this.nextPage + 1;
            this.loading = false;
          });
      },
      // Filter incoming notifications according to the embedded page
      // For HomeActivityPage - no filter
      // For ReportsLearnerActivityPage - notification.user_id === current learnerId
      // For ReportsGroupActivityPage - notification.user_id in group.users
      newNotificationsFilter(notification) {
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
        const userInGroup = this.groupMap[groupId].member_ids.includes(notification.user_id);
        let assignmentInGroup;

        if (notification.object === 'Lesson' || notification.object === 'Resource') {
          const lessonGroups = this.lessonMap[notification.lesson_id].groups;
          if (lessonGroups.length === 0) {
            assignmentInGroup = true;
          } else {
            assignmentInGroup = lessonGroups.includes(groupId);
          }
        }

        if (notification.object === 'Quiz') {
          const examGroups = this.examMap[notification.lesson_id].groups;
          if (examGroups.length === 0) {
            assignmentInGroup = true;
          } else {
            assignmentInGroup = examGroups.includes(groupId);
          }
        }

        // Check if Quiz was assigned to the group
        return userInGroup && assignmentInGroup;
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
      // Takes the raw notification and reshapes it to match the objects
      // created by the summarizedNotifications getter.
      reshapeNotification(notification) {
        const { object } = notification;
        // Finds the first group the user_id is in and just uses that label.
        // Does not make additional notifications if the user is in more than
        // one group that has been assigned lesson or quiz.
        let groups;
        if (object === QUIZ) {
          const examMatch = this.examMap[notification.quiz_id];
          if (!examMatch) return null;
          groups = [...examMatch.groups];
        } else if (object === LESSON || object === RESOURCE) {
          const lessonMatch = this.lessonMap[notification.lesson_id];
          if (!lessonMatch) return null;
          groups = [...lessonMatch.groups];
        }
        let collection = {};
        // If assigned to whole class
        if (groups.length === 0) {
          collection = {
            id: this.classId,
            name: this.className,
            type: CollectionTypes.CLASSROOM,
          };
        } else {
          const groupMatch = find(groups, groupId => {
            const found = this.groupMap[groupId];
            if (found) {
              return found.member_ids.includes(notification.user_id);
            }
            return false;
          });
          if (groupMatch) {
            collection = {
              id: this.groupMap[groupMatch].id,
              name: this.groupMap[groupMatch].name,
              type: CollectionTypes.LEARNERGROUP,
            };
          } else {
            // If learner group was deleted, then just give it the header
            // for the whole class
            collection = {
              id: this.classId,
              name: this.className,
              type: CollectionTypes.CLASSROOM,
            };
          }
        }

        let assignment = {};
        if (object === QUIZ) {
          assignment = {
            name: notification.quiz,
            type: ContentNodeKinds.EXAM,
            id: notification.quiz_id,
          };
        } else {
          assignment = {
            name: notification.lesson,
            type: ContentNodeKinds.LESSON,
            id: notification.lesson_id,
          };
        }

        const baseNotification = {
          event: notification.event,
          object,
          timestamp: notification.timestamp,
          collection,
          id: Number(notification.id),
          assignment,
          resource: {
            name: notification.resource || '',
            type: notification.contentnode_kind,
            id: notification.contentnode_id,
            content_id: get(this.contentNodeMap, [notification.contentnode_id, 'content_id'], ''),
          },
          learnerSummary: {
            firstUserName: notification.user,
            firstUserId: notification.user_id,
            total: 1,
          },
        };

        const targetPage = this.notificationLink(baseNotification);

        // This query parameter is used to adjust the 'back' button for different reports
        if (targetPage) {
          targetPage.query = {
            ...this.backLinkQuery,
          };
        }
        return {
          ...baseNotification,
          targetPage,
        };
      },
      cardPropsForNotification(notification) {
        const { collection } = notification;
        const learnerContext =
          collection.type === CollectionTypes.LEARNERGROUP ? collection.name : '';
        // Only differences from ActivityBlock is that there is no targetPage,
        // and the time is used
        return {
          eventType: notification.event,
          objectType: notification.object,
          resourceType: notification.resource.type,
          contentContext: notification.assignment.name,
          learnerContext,
          time: notification.timestamp,
          targetPage: notification.targetPage,
        };
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
