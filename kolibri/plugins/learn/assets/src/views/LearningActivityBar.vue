<template>

  <nav :aria-label="$tr('optionsLabel')">
    <KToolbar
      style="z-index: 8"
      :style="contentSpecificStyles"
      class="toolbar"
    >
      <CoachContentLabel
        :value="isCoachContent"
        style="width: auto; margin-top: 8px"
      />
      <KLabeledIcon :style="{ 'margin-top': '8px' }">
        <template #icon>
          <LearningActivityIcon
            data-test="learningActivityIcon"
            :kind="learningActivities"
            :shaded="true"
          />
        </template>
        <KTextTruncator
          v-if="windowBreakpoint <= 3"
          :text="resourceTitle | truncateText(50)"
          :maxLines="1"
        />
        <KTextTruncator
          v-else
          :text="resourceTitle | truncateText(70)"
          :maxLines="1"
        />
      </KLabeledIcon>
      <ProgressIcon
        :progress="contentProgress"
        class="progress-icon"
      />

      <template #icon>
        <KIconButton
          icon="back"
          data-test="backButton"
          :tooltip="coreString('goBackAction')"
          :ariaLabel="coreString('goBackAction')"
          @click="onBackButtonClick"
        />
      </template>

      <template #actions>
        <Transition name="downloading-loader">
          <!--
            wrapping span needed here because
            (1) tooltip doesn't display when `ref` is on `KCircularLoader`
            (2) Transition needs a single child
          -->
          <span ref="downloadingLoader">
            <KCircularLoader
              :shouldShow="isDownloading"
              :minVisibleTime="3000"
              data-test="downloadingLoader"
              :size="24"
              :style="{ margin: '10px 4px 0px 4px' }"
            />
            <KTooltip
              reference="downloadingLoader"
              :refs="$refs"
            >
              {{ downloadingLoaderTooltip }}
            </KTooltip>
          </span>
        </Transition>

        <KIconButton
          v-if="isQuiz && !showingReportState"
          ref="timerButton"
          data-test="timerButton"
          icon="timer"
          :tooltip="coreString('timeSpentLabel')"
          :ariaLabel="coreString('timeSpentLabel')"
          @click="toggleTimer"
        />
        <CoreMenu
          v-show="isTimerOpen"
          ref="timer"
          class="menu"
          :style="{ left: isRtl ? '16px' : 'auto', right: isRtl ? 'auto' : '16px' }"
          :raised="true"
          :isOpen="isTimerOpen"
          :containFocus="true"
          @close="closeTimer"
        >
          <template #options>
            <div class="timer-display">
              <div>
                <strong>{{ coreString('timeSpentLabel') }}</strong>
              </div>
              <div :style="{ paddingBottom: '8px' }">
                <TimeDuration :seconds="timeSpent" />
              </div>
              <div v-if="duration">
                <strong>{{ learnString('suggestedTime') }}</strong>
              </div>
              <SuggestedTime
                v-if="duration"
                :seconds="duration"
              />
            </div>
          </template>
        </CoreMenu>
        <DeviceConnectionStatus
          v-if="deviceId"
          :deviceId="deviceId"
        />

        <TransitionGroup name="bar-actions">
          <KIconButton
            v-for="action in barActions"
            :key="action.id"
            :data-test="`bar_${action.dataTest}`"
            :icon="action.icon"
            :color="action.iconColor"
            :tooltip="action.label"
            :ariaLabel="action.label"
            :disabled="action.disabled"
            class="bar-actions-item"
            :class="action.id === 'next-steps' && nextStepsAnimate ? 'bounce' : ''"
            @click="onActionClick(action.event)"
          />
        </TransitionGroup>

        <span class="menu-wrapper">
          <KIconButton
            v-if="menuActions.length"
            ref="moreOptionsButton"
            data-test="moreOptionsButton"
            icon="optionsHorizontal"
            :tooltip="$tr('moreOptions')"
            :ariaLabel="$tr('moreOptions')"
            @click="toggleMenu"
          />
          <CoreMenu
            v-show="isMenuOpen"
            ref="menu"
            class="menu"
            :style="{ left: isRtl ? '16px' : 'auto', right: isRtl ? 'auto' : '16px' }"
            :raised="true"
            :isOpen="isMenuOpen"
            :containFocus="true"
            @close="closeMenu"
            @shouldFocusFirstEl="findFirstEl()"
          >
            <template #options>
              <CoreMenuOption
                v-for="action in menuActions"
                :key="action.id"
                :data-test="`menu_${action.dataTest}`"
                :disabled="action.disabled"
                :style="{ cursor: 'pointer' }"
                :icon="action.icon"
                @select="onActionClick(action.event)"
              >
                <KLabeledIcon>
                  <template #icon>
                    <KIcon
                      :icon="action.icon"
                      :color="action.iconColor"
                    />
                  </template>
                  <div>{{ action.label }}</div>
                </KLabeledIcon>
              </CoreMenuOption>
            </template>
          </CoreMenu>
        </span>
      </template>
    </KToolbar>
  </nav>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CoachContentLabel from 'kolibri-common/components/labels/CoachContentLabel';
  import CoreMenu from 'kolibri/components/CoreMenu';
  import { ContentNodeKinds } from 'kolibri/constants';
  import CoreMenuOption from 'kolibri/components/CoreMenu/CoreMenuOption';
  import ProgressIcon from 'kolibri-common/components/labels/ProgressIcon';
  import KToolbar from 'kolibri-design-system/lib/KToolbar';
  import { validateLearningActivity } from 'kolibri/utils/validators';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import SuggestedTime from 'kolibri-common/components/SuggestedTime';
  import get from 'lodash/get';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import commonLearnStrings from './commonLearnStrings';
  import DeviceConnectionStatus from './DeviceConnectionStatus.vue';

  export default {
    name: 'LearningActivityBar',
    components: {
      CoachContentLabel,
      CoreMenu,
      CoreMenuOption,
      LearningActivityIcon,
      ProgressIcon,
      KToolbar,
      TimeDuration,
      SuggestedTime,
      DeviceConnectionStatus,
    },
    filters: {
      truncateText(value, maxLength) {
        if (value && value.length > maxLength) {
          return value.substring(0, maxLength) + '...';
        }
        return value;
      },
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        windowBreakpoint,
      };
    },
    /**
     * Emits the following events:
     * - `navigateBack` on back button click
     * - `viewResourceList` on 'View lesson plan'/'View topic resources' click
     * - `toggleBookmark` on 'Save to bookmarks'/ 'Remove from bookmarks' click
     * - `markComplete` on 'Mark resource as finished' click. Only when
     *                  a resource can be marked as complete.
     * - `viewInfo` on 'View information' click
     * - `download` on 'Download' click
     */
    props: {
      resourceTitle: {
        type: String,
        required: true,
      },
      /**
       * An array of one or more learning activities constants
       */
      learningActivities: {
        type: Array,
        required: true,
        validator: validateLearningActivity,
      },
      /**
       * Is the bar used in the context of a lesson?
       * There are slight differences in rendering
       * related to the context, e.g. action buttons labels.
       */
      isLessonContext: {
        type: Boolean,
        required: false,
        default: false,
      },
      isBookmarked: {
        type: Boolean,
        required: false,
        default: false,
      },
      /**
       * Does a resource have the option to be
       * manually marked as complete?
       * Used to determine if a button for this action
       * should be displayed.
       */
      allowMarkComplete: {
        type: Boolean,
        required: false,
        default: false,
      },
      /**
    The progress of the currently viewed content to determine
    if and which progress icon should be shown (none/started/complete)
    */
      contentProgress: {
        type: Number,
        required: false,
        default: 0,
      },
      /**
    A 1/0 Boolean check whether we should show the Coach Content icon
    to be passed to the CoachContentLabel component
    */
      isCoachContent: {
        type: Number,
        required: false,
        default: 0,
      },
      /**
    The ContentNodeKinds kind of the content being viewed
    */
      contentKind: {
        type: String,
        required: false,
        default: null,
      },
      /**
    Is this a practice quiz?
    */
      isQuiz: {
        type: Boolean,
        required: false,
        default: false,
      },
      /**
    Is the post-quiz report what is currently displayed?
    */
      showingReportState: {
        type: Boolean,
        required: false,
        default: false,
      },
      /**
    Suggested time in seconds
    */
      duration: {
        type: Number,
        required: false,
        default: null,
      },
      /**
    Actual time spent in seconds
    */
      timeSpent: {
        type: Number,
        required: false,
        default: null,
      },
      /**
    A Boolean check whether we should show the Bookmark Icon
    what should not happen if the user is not logged in
    */
      showBookmark: {
        type: Boolean,
        required: false,
        default: true,
      },
      /**
       * Shows the download button when truthy
       */
      showDownloadButton: {
        type: Boolean,
        required: false,
        default: false,
      },
      /**
       * Shows the downloading loader and disables download action when truthy
       */
      isDownloading: {
        type: Boolean,
        required: false,
        default: false,
      },
      /**
       * Tooltip text for the downloading loader.
       */
      downloadingLoaderTooltip: {
        type: String,
        required: false,
        default: '',
      },
    },
    data() {
      return {
        isMenuOpen: false,
        isTimerOpen: false,
        nextStepsAnimate: false,
      };
    },

    computed: {
      deviceId() {
        return get(this.$route, 'params.deviceId');
      },

      showMarkComplete() {
        return this.allowMarkComplete && this.contentProgress < 1;
      },
      disableDownloadButton() {
        return this.isDownloading;
      },
      allActions() {
        const actions = [
          {
            id: 'view-resource-list',
            icon: 'resourceList',
            label: this.isLessonContext
              ? this.$tr('viewLessonResources')
              : this.$tr('viewTopicResources'),
            event: 'viewResourceList',
            dataTest: this.isLessonContext ? 'viewLessonPlanButton' : 'viewTopicResourcesButton',
          },
        ];
        if (this.showBookmark) {
          actions.push({
            id: 'bookmark',
            icon: this.isBookmarked ? 'bookmark' : 'bookmarkEmpty',
            label: this.isBookmarked
              ? this.coreString('removeFromBookmarks')
              : this.coreString('saveToBookmarks'),
            event: 'toggleBookmark',
            disabled: this.isBookmarked === null,
            dataTest: this.isBookmarked ? 'removeBookmarkButton' : 'addBookmarkButton',
          });
        }
        if (this.showDownloadButton) {
          actions.push({
            id: 'download',
            icon: 'download',
            iconColor: this.disableDownloadButton ? this.$themeTokens.textDisabled : null,
            label: this.coreString('downloadAction'),
            event: 'download',
            dataTest: 'downloadButton',
            disabled: this.disableDownloadButton,
          });
        }
        if (this.showMarkComplete) {
          actions.push({
            id: 'mark-complete',
            icon: 'star',
            iconColor: this.$themeTokens.mastered,
            label: this.learnString('markResourceAsCompleteLabel'),
            event: 'markComplete',
            dataTest: 'markCompleteButton',
          });
        }
        if (this.contentProgress >= 1) {
          actions.unshift({
            id: 'next-steps',
            icon: 'forwardRounded',
            label: this.learnString('nextStepsLabel'),
            event: 'completionModal',
          });
        }
        actions.push({
          id: 'view-info',
          icon: 'info',
          label: this.coreString('viewInformation'),
          event: 'viewInfo',
          dataTest: 'viewInfoButton',
        });

        return actions;
      },
      numBarActions() {
        let maxSize = 1;
        if (this.windowBreakpoint === 1 || this.windowBreakpoint === 2) {
          maxSize = 2;
        } else if (this.windowBreakpoint > 2) {
          // Ensure to hide the mark complete button in the dropdown
          // to prevent instinctive points grabbing!
          maxSize = this.showMarkComplete ? 3 : 4;
        }
        // If maxSize doesn't handle all of the items, we need to
        // reserve a space for show options button.
        return this.allActions.length > maxSize ? maxSize - 1 : maxSize;
      },
      barActions() {
        return this.allActions.slice(0, this.numBarActions);
      },
      menuActions() {
        return this.allActions.slice(this.numBarActions);
      },
      contentSpecificStyles() {
        // The prime difference is that Exercises won't have shadows under the KToolbar
        // because the LessonMasteryBar lives under it and has its own drop shadow.
        if (this.contentKind === ContentNodeKinds.EXERCISE) {
          return { border: `1px solid ${this.$themeTokens.fineLine}`, 'box-shadow': 'none' };
        } else {
          return {};
        }
      },
    },
    created() {
      window.addEventListener('click', this.onWindowClick);
      this.$on('markComplete', () => this.$store.commit('SET_SHOW_COMPLETE_CONTENT_MODAL', true));
    },
    beforeDestroy() {
      window.removeEventListener('click', this.onWindowClick);
    },
    methods: {
      closeMenu({ focusMoreOptionsButton = true } = {}) {
        this.isMenuOpen = false;
        if (!focusMoreOptionsButton) {
          return;
        }
        this.$nextTick(() => {
          this.$refs.moreOptionsButton.$el.focus();
        });
      },
      toggleTimer() {
        this.isTimerOpen = !this.isTimerOpen;
        if (!this.isTimerOpen) {
          return;
        }
        this.$nextTick(() => {
          this.$refs.timer.$el.focus();
        });
      },
      closeTimer({ focusTimerButton = true } = {}) {
        this.isTimerOpen = false;
        if (!focusTimerButton) {
          return;
        }
        this.$nextTick(() => {
          this.$refs.timerButton.$el.focus();
        });
      },
      toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        if (!this.isMenuOpen) {
          return;
        }
        this.$nextTick(() => {
          this.$refs.menu.$el.focus();
        });
      },
      onBackButtonClick() {
        this.$emit('navigateBack');
      },
      onActionClick(actionEvent) {
        this.$emit(actionEvent);
      },
      onWindowClick(event) {
        // close menu on outside click
        if (this.isMenuOpen) {
          if (
            !this.$refs.menu.$el?.contains(event.target) &&
            !this.$refs.moreOptionsButton?.$el.contains(event.target)
          ) {
            this.closeMenu({ focusMoreOptionsButton: false });
          }
        }
        if (this.isTimerOpen) {
          if (
            !this.$refs.timerButton?.$el.contains(event.target) &&
            !this.$refs.timer?.$el.contains(event.target)
          ) {
            this.closeTimer({ focusTimerButton: false });
          }
        }
      },
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.menu.focusFirstEl();
        });
      },
      /**
       * @public
       */
      animateNextSteps() {
        this.nextStepsAnimate = true;
        setTimeout(() => {
          this.nextStepsAnimate = false;
        }, 1500);
      },
    },
    $trs: {
      moreOptions: {
        message: 'More options',
        context: 'Tooltip text.',
      },
      viewLessonResources: {
        message: 'View lesson resources',
        context: 'Tooltip text.',
      },
      viewTopicResources: {
        message: 'View folder resources',
        context: 'Tooltip text.',
      },
      optionsLabel: {
        message: 'Options',
        context: 'A label for the section of the page containing toolbar buttons',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .menu-wrapper {
    position: relative;
  }

  .menu {
    position: absolute;
    top: 50%;
    z-index: 16;
    min-width: 270px;
    transform: translateY(16px);
  }

  /*
  Make truncation via text ellipsis work well in UIToolbar's body flex item:
  By default, `min-width` is `auto`  for a flex item which means it
  cannot be smaller than the size of its content which causes the whole
  title being visible even in cases when it should be already truncated.
  Overriding it to `0` allows the title to be shrinked and then truncated
  properly. Labeled icon wrapper needs to have this set too for its parent
  flex item to shrink.
*/
  /deep/ .ui-toolbar__body,
  /deep/ .labeled-icon-wrapper {
    min-width: 0;
  }

  /deep/ .ui-toolbar__left {
    margin-left: 5px;
    overflow: hidden;
  }

  /deep/ .ui-toolbar__right {
    display: flex;
  }

  /deep/ .ui-toolbar__nav-icon {
    margin-left: 0; // prevents icon cutoff
  }

  /deep/ .ui-toolbar__body {
    flex-grow: 0; // make sure that the completion icon is right next to the title
    align-items: center;
  }

  /deep/ .progress-icon .ui-icon {
    margin-top: -1px;
    margin-left: 16px;

    svg {
      width: 18px;
      height: 18px;
    }
  }

  .timer-display {
    padding: 16px;
    font-size: 14px;
  }

  @media (prefers-reduced-motion: reduce) {
    .bounce {
      transition-delay: 0s;
      transition-duration: 0s;
      animation-duration: 1ms;
      animation-delay: -1ms;
      animation-iteration-count: 1;
    }
  }

  @keyframes bounce {
    0% {
      transform: scale(1, 1) translateY(0);
    }

    10% {
      transform: scale(1.1, 0.9) translateY(0);
    }

    30% {
      transform: scale(0.9, 1.1) translateY(-0.5em);
    }

    50% {
      transform: scale(1.05, 0.95) translateY(0);
    }

    57% {
      transform: scale(1, 1) translateY(-0.125em);
    }

    64% {
      transform: scale(1, 1) translateY(0);
    }

    100% {
      transform: scale(1, 1) translateY(0);
    }
  }

  .bounce {
    animation-name: bounce;
    animation-duration: 1s;
    animation-timing-function: cubic-bezier(0.28, 0.84, 0.42, 1);
    animation-delay: 0s;
    animation-iteration-count: infinite;
    animation-direction: normal;
  }

  .downloading-loader-enter-active,
  .downloading-loader-leave-active {
    transition: opacity 0.4s ease-in-out;
  }

  .downloading-loader-enter,
  .downloading-loader-leave-to {
    opacity: 0;
  }

  // https://v2.vuejs.org/v2/guide/transitions.html#List-Move-Transitions
  .bar-actions-item {
    transition: all 0.5s ease-in-out;
  }

  .bar-actions-enter,
  .bar-actions-leave-to {
    opacity: 0;
  }

  .bar-actions-leave-active {
    position: absolute;
  }

</style>
