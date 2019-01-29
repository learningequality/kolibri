<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <p>
        <BackLink
          :to="classRoute('HomePage', {})"
          :text="$tr('back')"
        />
      </p>
      <h2>{{ $tr('classActivity') }}</h2>
      <NotificationsFilter
        :resourceFilter.sync="resourceFilter"
        :progressFilter.sync="progressFilter"
      />
      <br>

      <div>
        <p v-if="notifications.length === 0">
          {{ $tr('noActivity') }}
        </p>

        <transition-group name="list">
          <NotificationCard
            v-for="notification in notifications"
            v-show="showNotification(notification)"
            :key="notification.id"
            v-bind="cardProps(notification)"
          >
            {{ cardTextForNotification(notification) }}
          </NotificationCard>
        </transition-group>
      </div>

      <div v-if="noFiltersApplied" class="show-more">
        <transition mode="out-in">
          <KLinearLoader v-if="loading" :delay="false" />
          <template v-else>
            <KButton
              v-if="moreResults"
              :text="coachStrings.$tr('showMoreAction')"
              @click="fetchNotifications"
            />
          </template>
        </transition>
      </div>

    </div>
  </CoreBase>

</template>


<script>

  import find from 'lodash/find';
  import maxBy from 'lodash/maxBy';
  import { mapState } from 'vuex';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import commonCoach from '../common';
  import NotificationsFilter from '../common/notifications/NotificationsFilter';
  import NotificationCard from '../common/notifications/NotificationCardNoLink';
  import { nStringsMixin } from '../common/notifications/notificationStrings';
  import notificationsResource from '../../apiResources/notifications';
  import { NotificationObjects, NotificationEvents } from '../../constants/notificationsConstants';
  import { CollectionTypes } from '../../constants/lessonsConstants';

  const { LESSON, RESOURCE, QUIZ } = NotificationObjects;

  export default {
    name: 'HomeActivityPage',
    components: {
      KLinearLoader,
      NotificationsFilter,
      NotificationCard,
    },
    mixins: [commonCoach, nStringsMixin],
    data() {
      return {
        loading: true,
        error: false,
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
      ...mapState('classSummary', ['examMap', 'lessonMap', 'groupMap', 'learnerMap', 'name']),
      ...mapState('coachNotifications', {
        allNotifications: 'notifications',
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
    },
    watch: {
      allNotifications(newVal) {
        const newNotifications = newVal.filter(n => Number(n.id) > this.lastNotificationId);
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
      fetchNotifications() {
        this.loading = true;
        return notificationsResource
          .fetchCollection({
            getParams: {
              collection_id: this.$route.params.classId,
              page_size: 10,
              page: this.nextPage,
            },
            force: true,
          })
          .then(data => {
            this.notifications = [
              ...this.notifications,
              ...data.results.map(this.reshapeNotification).filter(Boolean),
            ];
            this.moreResults = data.next !== null;
            this.nextPage = this.nextPage + 1;
            this.loading = false;
          });
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
            name: this.name,
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
              name: this.groupMap[groupMatch].name,
              type: CollectionTypes.LEARNERGROUP,
            };
          } else {
            // If learner group was deleted, then just give it the header
            // for the whole class
            collection = {
              name: this.name,
              type: CollectionTypes.CLASSROOM,
            };
          }
        }

        return {
          event: notification.event,
          object,
          timestamp: notification.timestamp,
          collection,
          id: Number(notification.id),
          assignment: {
            name: object === QUIZ ? notification.quiz : notification.lesson,
            type: object === QUIZ ? ContentNodeKinds.EXAM : ContentNodeKinds.LESSON,
          },
          resource: {
            name: notification.resource || '',
            type: notification.contentnode_kind,
          },
          learnerSummary: {
            firstUserName: notification.user,
            total: 1,
          },
        };
      },
      cardProps(notification) {
        let icon = '';
        let contentIcon = '';
        const { assignment, collection, object, event, resource } = notification;
        icon = {
          [NotificationEvents.COMPLETED]: 'star',
          [NotificationEvents.STARTED]: 'clock',
          [NotificationEvents.HELP_NEEDED]: 'help',
        }[event];

        if (object === LESSON || object === QUIZ) {
          contentIcon = assignment.type;
        } else {
          contentIcon = resource.type;
        }

        return {
          icon,
          contentIcon,
          contentContext: assignment.name,
          learnerContext: collection.type === CollectionTypes.LEARNERGROUP ? collection.name : '',
          time: notification.timestamp,
        };
      },
    },
    $trs: {
      back: 'Class home',
      classActivity: 'Class activity',
      noActivity: 'No activity in your class',
      viewMore: 'View more',
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/list-transition';

  .show-more {
    height: 100px;
  }

</style>
