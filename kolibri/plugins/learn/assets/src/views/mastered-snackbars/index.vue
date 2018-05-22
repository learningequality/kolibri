<template>

  <div>
    <transition
      name="slidein"
      mode="out-in"
    >
      <snackbar
        v-if="currentSnackbar === SNACKBARS.POINTS"
        :key="SNACKBARS.POINTS"
        :isUserLoggedIn="isUserLoggedIn"
        @close="currentSnackbar = SNACKBARS.NEXT_RESOURCE"
      >
        <template slot="icon">
          <progress-icon :progress="1" />
        </template>

        <template slot="content">
          <points-icon
            class="points-icon"
            :active="true"
          />
          <div class="points-amount">{{ $tr('plusPoints', { maxPoints }) }}</div>
        </template>
      </snackbar>

      <snackbar
        v-else-if="currentSnackbar === SNACKBARS.NEXT_RESOURCE"
        :key="SNACKBARS.NEXT_RESOURCE"
        :isUserLoggedIn="isUserLoggedIn"
        @close="$emit('close')"
      >
        <template slot="icon">
          <content-icon
            class="content-icon icon-bg"
            :kind="nextContent.kind"
            :showTooltip="true"
            :style="{backgroundColor: iconBackgroundColor }"
          />
        </template>

        <template slot="content">
          <h2 class="next-content-heading">{{ $tr('next') }}</h2>
          <k-router-link
            :text="nextContent.title"
            :to="nextContentLink"
            class="next-content-title"
            dir="auto"
          />
        </template>
      </snackbar>
    </transition>

  </div>

</template>


<script>

  import { isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
  import { MaxPointsPerContent, ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import pointsIcon from 'kolibri.coreVue.components.pointsIcon';
  import progressIcon from 'kolibri.coreVue.components.progressIcon';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import snackbar from './snackbar';

  const SNACKBARS = { POINTS: 'POINTS', NEXT_RESOURCE: 'NEXT_RESOURCE' };

  export default {
    name: 'masteredSnackbars',
    components: {
      pointsIcon,
      progressIcon,
      contentIcon,
      kRouterLink,
      snackbar,
    },
    props: {
      nextContent: {
        type: Object,
        required: false,
      },
      nextContentLink: {
        type: Object,
        required: false,
      },
    },
    data: () => ({
      currentSnackbar: null,
      pointsTimeout: null,
      nextContentTimeout: null,
    }),

    computed: {
      SNACKBARS() {
        return SNACKBARS;
      },
      maxPoints() {
        return MaxPointsPerContent;
      },
      iconBackgroundColor() {
        switch (this.nextContent.kind) {
          case ContentNodeKinds.EXERCISE:
            return '#0eafaf';
          case ContentNodeKinds.VIDEO:
            return '#3938A5';
          case ContentNodeKinds.AUDIO:
            return '#E65997';
          case ContentNodeKinds.HTML5:
            return '#FF8B41';
          default:
            return '#262626';
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
      plusPoints: '+ { maxPoints, number } Points',
      next: 'Next:',
    },
    vuex: {
      getters: {
        isUserLoggedIn,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .points-icon
    display: inline-block
    width: 24px
    height: 24px
    vertical-align: middle
    margin-right: 4px

  .icon-bg
    border-radius: 50%

  .points-amount
    display: inline-block
    vertical-align: middle
    font-weight: bold
    color: $core-status-correct

  .content-icon
    font-size: 18px
    color: white
    border-radius: 50%
    display: block
    height: 24px
    width: 24px
    text-align: center

  .next-content-heading
    margin: 0 0 4px
    font-size: 12px
    font-weight: normal
    color: $core-text-annotation

  .next-content-title
    font-weight: bold

  .slidein-enter-active
    animation-name: slidein

  .slidein-leave-active
    animation-name: slidein
    animation-direction: reverse

  @keyframes slidein
    from
      transform: translate3d(0, 100%, 0)
      visibility: visible
    to
      transform: translate3d(0, 0, 0)

</style>
