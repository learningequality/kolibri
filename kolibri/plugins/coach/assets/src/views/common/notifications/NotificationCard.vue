<template>

  <div class="notification">
    <CoachStatusIcon
      :icon="statusIcon"
      class="icon"
    />
    <p class="context icon-spacer">{{ context }}</p>
    <KGrid>
      <KGridItem :sizes="mainColSizes">
        <div class="icon-spacer">
          <ContentIcon
            slot="icon"
            class="content-icon"
            :kind="contentIcon"
            :showTooltip="false"
          />
          <KRouterLink
            v-if="targetPage && targetPage.name"
            :text="linkText"
            :to="getRoute(targetPage)"
          />
          <span v-else>
            {{ linkText }}
          </span>
        </div>
      </KGridItem>

      <KGridItem
        v-if="time"
        :sizes="[1, 2, 3]"
        alignment="right"
      >
        <ElapsedTime :date="parseDate(time)" />
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import CoachStatusIcon from '../status/CoachStatusIcon';
  import {
    NotificationEvents,
    NotificationObjects,
  } from '../../../constants/notificationsConstants';

  const EventToIconMap = {
    [NotificationEvents.COMPLETED]: 'star',
    [NotificationEvents.STARTED]: 'clock',
    [NotificationEvents.HELP_NEEDED]: 'help',
  };

  export default {
    name: 'NotificationCard',
    components: {
      ContentIcon,
      CoachStatusIcon,
      ElapsedTime,
      KGrid,
      KGridItem,
      KRouterLink,
    },
    props: {
      targetPage: {
        type: Object,
        required: false,
        validator: validateLinkObject,
      },
      // Notification event: 'Started', 'Completed', 'HelpNeeded'
      eventType: {
        type: String,
        required: true,
        validator(value) {
          return Object.values(NotificationEvents).includes(value);
        },
      },
      // Notification object: 'Lesson', 'Quiz', 'Resource',
      objectType: {
        type: String,
        required: true,
        validator(value) {
          return Object.values(NotificationObjects).includes(value);
        },
      },
      // A ContentNodeKind
      resourceType: {
        type: String,
        required: false,
      },
      // group name
      learnerContext: {
        type: String,
        required: false,
      },
      // exam or lesson name
      contentContext: {
        type: String,
        required: false,
      },
      linkText: {
        type: String,
        required: true,
      },
      time: {
        type: String,
        required: false,
      },
    },
    computed: {
      statusIcon() {
        return EventToIconMap[this.eventType];
      },
      contentIcon() {
        if (this.objectType === NotificationObjects.QUIZ) {
          return 'exam';
        } else if (this.objectType === NotificationObjects.LESSON) {
          return 'lesson';
        } else {
          return this.resourceType;
        }
      },
      context() {
        if (this.learnerContext && this.contentContext) {
          return `${this.learnerContext} • ${this.contentContext}`;
        } else if (this.learnerContext) {
          return this.learnerContext;
        } else if (this.contentContext) {
          return this.contentContext;
        }
        return '';
      },
      mainColSizes() {
        if (this.time) {
          return [3, 6, 9];
        }
        return [4, 8, 12];
      },
    },
    methods: {
      parseDate(dateString) {
        return new Date(dateString);
      },
      getRoute({ name, params, query }) {
        return this.$router.getRoute(name, params, query);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .icon {
    // vertically align icon
    position: absolute;
    top: 50%;
    left: 2px;
    width: 1.5em;
    height: 1.5em;
    margin-top: -0.75em; // offset height
  }

  .icon-spacer {
    margin-left: 48px;
  }

  .content-icon {
    margin-right: 8px;
  }

  .message {
    font-weight: bold;
  }

  .notification {
    position: relative;
    padding-top: 8px;
    padding-bottom: 8px;
    text-decoration: none;
  }

  .context {
    margin-top: 4px;
    margin-bottom: 4px;
    font-size: small;
    color: gray;
  }

  .button-wrapper {
    position: relative;
  }

</style>
