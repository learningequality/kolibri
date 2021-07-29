<template>

  <div>
    <transition
      name="slidein"
      mode="out-in"
    >
      <Snackbar
        v-if="currentSnackbar === SNACKBARS.POINTS"
        :key="SNACKBARS.POINTS"
        @close="currentSnackbar = SNACKBARS.NEXT_RESOURCE"
      >
        <template #icon>
          <ProgressIcon :progress="1" style="position: relative; top: -2px;" />
        </template>

        <template #content>
          <PointsIcon class="points-icon" />
          <div
            class="points-amount"
            :style="{ color: $themeTokens.correct }"
          >
            {{ $tr('plusPoints', { maxPoints }) }}
          </div>
        </template>

        <template #alert>
          <UiAlert
            v-if="!isUserLoggedIn"
            :dismissible="false"
            :removeIcon="true"
            type="warning"
            class="alert"
          >
            {{ $tr('signIn') }}
          </UiAlert>
        </template>
      </Snackbar>

      <Snackbar
        v-else-if="currentSnackbar === SNACKBARS.NEXT_RESOURCE && nextContent"
        :key="SNACKBARS.NEXT_RESOURCE"
        @close="$emit('close')"
      >
        <template #icon>
          <ContentIcon
            class="content-icon icon-bg"
            :kind="nextContent.kind"
            :showTooltip="true"
            :color="$themeTokens.textInverted"
            :style="{ backgroundColor: iconBackgroundColor, color: $themeTokens.textInverted }"
          />
        </template>

        <template #content>
          <router-link
            class="rm-link-style"
            :style="{ color: $themeTokens.text }"
            :to="nextContentLink"
          >
            <h2
              class="next-content-heading"
              :style="{ color: $themeTokens.annotation }"
            >
              {{ $tr('next') }}
            </h2>
            <KRouterLink
              :text="nextContent.title"
              :to="nextContentLink"
              class="next-content-title"
              dir="auto"
            />
          </router-link>

        </template>
      </Snackbar>
    </transition>

  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { MaxPointsPerContent, ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import Snackbar from './Snackbar';

  const SNACKBARS = { POINTS: 'POINTS', NEXT_RESOURCE: 'NEXT_RESOURCE' };

  export default {
    name: 'MasteredSnackbars',
    components: {
      PointsIcon,
      ProgressIcon,
      ContentIcon,
      Snackbar,
      UiAlert,
    },
    props: {
      nextContent: {
        type: Object,
        default: () => ({}),
      },
      nextContentLink: {
        type: Object,
        default: () => ({}),
      },
    },
    data: () => ({
      currentSnackbar: null,
      pointsTimeout: null,
      nextContentTimeout: null,
    }),

    computed: {
      ...mapGetters(['isUserLoggedIn']),
      SNACKBARS() {
        return SNACKBARS;
      },
      maxPoints() {
        return MaxPointsPerContent;
      },
      iconBackgroundColor() {
        switch (this.nextContent.kind) {
          case ContentNodeKinds.EXERCISE:
            return this.$themeTokens.exercise;
          case ContentNodeKinds.VIDEO:
            return this.$themeTokens.video;
          case ContentNodeKinds.AUDIO:
            return this.$themeTokens.audio;
          case ContentNodeKinds.DOCUMENT:
            return this.$themeTokens.document;
          case ContentNodeKinds.HTML5:
            return this.$themeTokens.html5;
          default:
            return this.$themeTokens.topic;
        }
      },
    },
    watch: {
      currentSnackbar(val) {
        if (val === SNACKBARS.NEXT_RESOURCE) {
          this.nextContentTimeout = setTimeout(() => {
            this.currentSnackbar = null;
          }, 10000);
        }
      },
    },
    mounted() {
      this.currentSnackbar = SNACKBARS.POINTS;
      this.pointsTimeout = setTimeout(() => {
        if (this.currentSnackbar === SNACKBARS.POINTS) {
          this.currentSnackbar = SNACKBARS.NEXT_RESOURCE;
        }
      }, 4000);
    },
    beforeDestroy() {
      if (this.pointsTimeout) {
        clearTimeout(this.pointsTimeout);
      }
      if (this.nextContentTimeout) {
        clearTimeout(this.nextContentTimeout);
      }
    },
    $trs: {
      plusPoints: {
        message: '+ { maxPoints, number } Points',
        context:
          'Indicates the number of points earned for completing a task. You should only translate the word "points".',
      },
      next: {
        message: 'Next:',
        context: 'Indicates the name of the next resource in the lesson.',
      },
      signIn: {
        message: 'Sign in or create an account to begin earning points',
        context:
          'Notification to learner indicating that they need to sign in or sign up to Kolibri in order to earn points from completing exercises.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .points-icon {
    display: inline;
    margin: 8px 4px 0;
  }

  .icon-bg {
    border-radius: 50%;
  }

  /deep/ svg {
    width: 16px;
    height: 16px;
    margin-top: -1px;
    margin-left: 1px;
  }

  .points-amount {
    display: inline-block;
    font-weight: bold;
    vertical-align: middle;
  }

  .content-icon {
    display: block;
    width: 24px;
    height: 24px;
    font-size: 18px;
    text-align: center;
    border-radius: 50%;
  }

  .next-content-heading {
    margin: 0 0 4px;
    font-size: 12px;
    font-weight: normal;
  }

  .next-content-title {
    font-weight: bold;
  }

  .slidein-enter-active {
    animation-name: slidein;
  }

  .slidein-leave-active {
    animation-name: slidein;
    animation-direction: reverse;
  }

  @keyframes slidein {
    from {
      visibility: visible;
      transform: translate3d(0, 100%, 0);
    }
    to {
      transform: translate3d(0, 0, 0);
    }
  }

  .alert {
    margin-top: 8px;
    margin-bottom: 0;
  }

  .rm-link-style {
    display: block;
    text-decoration: none;
  }

</style>
