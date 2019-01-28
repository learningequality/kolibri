<template>

  <div class="notification">
    <p class="context icon-spacer">{{ context }}</p>
    <KGrid>
      <KGridItem :size="time ? 50 : 75" percentage>
        <CoachStatusIcon
          :icon="icon"
          class="icon"
        />
        <div class="icon-spacer">
          <ContentIcon
            class="content-icon"
            :kind="contentIcon"
            :showTooltip="false"
          />
          <span class="message">
            <slot></slot>
          </span>
        </div>
      </KGridItem>
      <KGridItem v-if="time" :size="25" percentage alignment="center">
        {{ time }}
      </KGridItem>
      <KGridItem :size="25" percentage>
        <div class="button-wrapper">
          <KRouterLink
            v-if="targetPage"
            appearance="flat-button"
            class="show-btn"
            :text="coachStrings.$tr('showAction')"
            :to="$router.getRoute(targetPage.name, targetPage.params)"
          />
        </div>
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import commonCoach from '../../common';
  import CoachStatusIcon from '../status/CoachStatusIcon';

  export default {
    name: 'NotificationCard',
    components: {
      ContentIcon,
      CoachStatusIcon,
    },
    mixins: [commonCoach],
    props: {
      targetPage: {
        type: Object,
        required: false,
        validator: validateLinkObject,
      },
      // Primary icon ('star', 'help', or 'clock')
      icon: {
        type: String,
        required: true,
      },
      // Content icon (see validateContentNodeKind utility for valid values)
      contentIcon: {
        type: String,
        required: true,
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
      // exam or lesson name
      time: {
        type: String,
        required: false,
      },
    },
    computed: {
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
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .icon {
    position: absolute;
  }

  .icon-spacer {
    margin-left: 40px;
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

  .show-btn {
    position: absolute;
    top: -15px;
    right: 0;
  }

</style>
