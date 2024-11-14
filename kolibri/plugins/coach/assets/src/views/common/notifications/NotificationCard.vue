<template>

  <div class="notification">
    <CoachStatusIcon
      :icon="statusIcon"
      class="icon"
    />
    <p
      class="context icon-spacer"
      :style="{ color: $themeTokens.annotation }"
    >
      {{ context }}
    </p>
    <KFixedGrid numCols="4">
      <KFixedGridItem :span="showTime ? 3 : 4">
        <div class="icon-spacer">
          <ContentIcon
            v-if="contentIcon"
            class="content-icon"
            :kind="contentIcon"
            :showTooltip="false"
          />
          <template v-else>
            <KIcon
              ref="warning"
              icon="warning"
              :color="$themePalette.yellow.v_600"
            />
            <KTooltip
              reference="warning"
              placement="bottom"
              :refs="$refs"
            >
              {{ coreString('resourceNotFoundOnDevice') }}
            </KTooltip>
          </template>
          <KRouterLink
            v-if="route"
            :text="linkText"
            :to="route"
            class="link"
          />
          <span
            v-else
            class="link"
          >
            {{ linkText }}
          </span>
        </div>
      </KFixedGridItem>
      <KFixedGridItem
        v-if="showTime"
        :span="1"
        alignment="right"
      >
        <ElapsedTime :date="date" />
      </KFixedGridItem>
    </KFixedGrid>
  </div>

</template>


<script>

  import ContentIcon from 'kolibri-common/components/labels/ContentIcon';
  import ElapsedTime from 'kolibri-common/components/ElapsedTime';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import CoachStatusIcon from '../status/CoachStatusIcon';
  import {
    NotificationEvents,
    NotificationObjects,
  } from '../../../constants/notificationsConstants';
  import { CollectionTypes } from '../../../constants/lessonsConstants';
  import { cardTextForNotification } from './notificationStrings';
  import { notificationLink } from './../../../modules/coachNotifications/gettersUtils';

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
    },
    mixins: [commonCoreStrings],
    props: {
      notification: {
        type: Object,
        required: true,
        validator(notification) {
          return (
            Object.values(NotificationEvents).includes(notification.event) &&
            Object.values(NotificationObjects).includes(notification.object)
          );
        },
      },
      lastQuery: {
        type: Object,
        default: () => ({}),
      },
      showTime: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      statusIcon() {
        return EventToIconMap[this.notification.event];
      },
      contentIcon() {
        if (this.notification.object === NotificationObjects.QUIZ) {
          return 'exam';
        } else if (this.notification.object === NotificationObjects.LESSON) {
          return 'lesson';
        } else if (this.notification.resource.type.length) {
          return this.notification.resource.type;
        }
        return null;
      },
      context() {
        const contentContext = this.notification.assignment.name;
        const learnerContext =
          this.notification.collection.type === CollectionTypes.LEARNERGROUP
            ? this.notification.collection.name
            : '';
        if (learnerContext && contentContext) {
          return this.isRtl
            ? `${contentContext} • ${learnerContext}`
            : `${learnerContext} • ${contentContext}`;
        } else if (learnerContext) {
          return learnerContext;
        } else if (contentContext) {
          return contentContext;
        }
        return '';
      },
      date() {
        return new Date(this.notification.timestamp);
      },
      linkText() {
        return cardTextForNotification(this.notification);
      },
      route() {
        const targetPage = notificationLink(this.notification);
        if (targetPage) {
          return {
            ...targetPage,
            query: {
              ...this.lastQuery,
            },
          };
        }
        return null;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

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
  }

  .button-wrapper {
    position: relative;
  }

  .link {
    overflow-wrap: break-word;
  }

  /* Fixes spacing only observed in this notification card content icon */
  /deep/.content-icon svg {
    top: -2px !important;
  }

</style>
