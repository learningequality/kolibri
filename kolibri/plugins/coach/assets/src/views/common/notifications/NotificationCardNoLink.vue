<template>

  <div class="notification">
    <p class="context icon-spacer">{{ context }}</p>
    <KGrid>
      <KGridItem :size="50" percentage>
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
      <KGridItem :size="50" percentage alignment="center">
        <ElapsedTime :date="parseDate(time)" />
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import commonCoach from '../../common';
  import CoachStatusIcon from '../status/CoachStatusIcon';

  export default {
    name: 'NotificationCardNoLink',
    components: {
      ContentIcon,
      CoachStatusIcon,
      ElapsedTime,
    },
    mixins: [commonCoach],
    props: {
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
      // timestamp string (will be converted inside the component)
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
    methods: {
      parseDate(dateString) {
        return new Date(dateString);
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
    padding-top: 4px;
    padding-bottom: 4px;
    margin-bottom: 16px;
    text-decoration: none;
    border-top: 1px solid rgb(223, 223, 223);
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
