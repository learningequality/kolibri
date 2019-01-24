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
          :to="route('HomePage')"
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

        <NotificationCard
          v-for="notification in notifications"
          v-show="showNotification(notification)"
          :key="notification.id"
          v-bind="cardProps(notification)"
        >
          {{ cardTextForNotification(notification) }}
        </NotificationCard>
      </div>

      <div v-if="showShowMore" class="show-more">
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
  import { mapState } from 'vuex';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import commonCoach from '../common';
  import NotificationsFilter from '../common/notifications/NotificationsFilter';
  import NotificationCard from '../common/notifications/NotificationCardNoLink';
  import { nStringsMixin } from '../common/notifications/notificationStrings';
  import notificationsResource from '../../apiResources/notifications';

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
      };
    },
    computed: {
      ...mapState('classSummary', ['examMap', 'lessonMap', 'groupMap', 'learnerMap', 'name']),
      showShowMore() {
        return this.progressFilter === 'all' && this.resourceFilter === 'all';
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
              page_size: 20,
              page: this.nextPage,
            },
            force: true,
          })
          .then(data => {
            const filtered = data.results.filter(this.filterNotifications);
            this.notifications = [...this.notifications, ...filtered.map(this.reshapeNotification)];
            this.moreResults = data.next !== null;
            this.nextPage = this.nextPage + 1;
            this.loading = false;
          });
      },
      showNotification(notification) {
        if (this.progressFilter === 'all' && this.resourceFilter === 'all') {
          return true;
        }
        let progressPasses = true;
        let resourcePasses = true;
        if (this.progressFilter !== 'all') {
          progressPasses = notification.event === this.progressFilter;
        }
        if (this.resourceFilter !== 'all') {
          if (this.resourceFilter === 'lesson') {
            resourcePasses = notification.object === 'Lesson';
          } else if (this.resourceFilter === 'quiz') {
            resourcePasses = notification.object === 'Quiz';
          } else {
            resourcePasses = notification.resource.type === this.resourceFilter;
          }
        }
        return progressPasses && resourcePasses;
      },
      // Used to filter out notifications with deleted references
      filterNotifications(notification) {
        if (notification.user === '') {
          return false;
        }
        if (notification.object === 'Quiz' && notification.quiz === '') {
          return false;
        }
        if (notification.object === 'Lesson' || notification.object === 'Resource') {
          return notification.lesson !== '' && notification.resource !== '';
        }
        return true;
      },
      // Takes the raw notification and reshapes it to match the objects
      // created by the summarizedNotifications getter.
      reshapeNotification(notification) {
        const { object } = notification;
        // Finds the first group the user_id is in and just uses that label.
        // Does not make additional notifications if the user is in more than
        // one group that has been assigned lesson or quiz.
        let groups;
        if (object === 'Quiz') {
          groups = [...this.examMap[notification.quiz_id].groups];
        } else if (object === 'Lesson' || object === 'Resource') {
          groups = [...this.lessonMap[notification.lesson_id].groups];
        }
        const wholeClass = groups.length === 0;
        let collection = {};
        if (wholeClass) {
          collection = {
            name: this.name,
            type: 'classroom',
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
              type: 'learnergroup',
            };
          } else {
            // If learner group was deleted, then just give it the header
            // for the whole class
            collection = {
              name: this.name,
              type: 'classroom',
            };
          }
        }

        return {
          event: notification.event,
          object,
          timestamp: notification.timestamp,
          collection,
          assignment: {
            name: object === 'Quiz' ? notification.quiz : notification.lesson,
            type: object === 'Quiz' ? 'exam' : 'lesson',
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
          Completed: 'star',
          Started: 'clock',
          HelpNeeded: 'help',
        }[event];

        if (object === 'Lesson' || object === 'Quiz') {
          contentIcon = assignment.type;
        } else {
          contentIcon = resource.type;
        }

        return {
          icon,
          contentIcon,
          contentContext: assignment.name,
          learnerContext: collection.type === 'learnergroup' ? collection.name : '',
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

  .show-more {
    height: 100px;
  }

</style>
