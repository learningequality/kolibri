<template>

  <UiToolbar style="z-index: 8;" :style="contentSpecificStyles" class="toolbar" :class="isRTL">
    <CoachContentLabel
      :value="isCoachContent"
      style="margin-top: 8px; width: auto;"
    />
    <KLabeledIcon :style="{ 'margin-top': '8px' }">
      <template #icon>
        <LearningActivityIcon
          data-test="learningActivityIcon"
          :kind="learningActivities"
          :shaded="true"
        />
      </template>
      <TextTruncatorCss
        :text="resourceTitle"
        :maxLines="1"
      />
    </KLabeledIcon>
    <ProgressIcon :progress="contentProgress" class="progress-icon" />

    <template #icon>
      <KIconButton
        icon="back"
        data-test="backButton"
        :tooltip="$tr('goBack')"
        :ariaLabel="$tr('goBack')"
        @click="onBackButtonClick"
      />
    </template>

    <template #actions>
      <KIconButton
        v-for="action in barActions"
        :key="action.id"
        :data-test="`bar_${action.dataTest}`"
        :icon="action.icon"
        :color="action.iconColor"
        :tooltip="action.label"
        :ariaLabel="action.label"
        :disabled="action.disabled"
        :class="action.id === 'next-steps' && nextStepsAnimate ? 'bounce' : ''"
        @click="onActionClick(action.event)"
      />

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
              :style="{ 'cursor': 'pointer' }"
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
  </UiToolbar>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import TextTruncatorCss from 'kolibri.coreVue.components.TextTruncatorCss';
  import { validateLearningActivity } from 'kolibri.utils.validators';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import LearningActivityIcon from './LearningActivityIcon.vue';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'LearningActivityBar',
    components: {
      CoachContentLabel,
      CoreMenu,
      CoreMenuOption,
      TextTruncatorCss,
      LearningActivityIcon,
      ProgressIcon,
      UiToolbar,
    },
    mixins: [KResponsiveWindowMixin, commonLearnStrings, commonCoreStrings],
    /**
     * Emits the following events:
     * - `navigateBack` on back button click
     * - `viewResourceList` on 'View lesson plan'/'View topic resources' click
     * - `toggleBookmark` on 'Save to bookmarks'/ 'Remove from bookmarks' click
     * - `markComplete` on 'Mark resource as finished' click. Only when
     *                  a resource can be marked as complete.
     * - `viewInfo` on 'View information' click
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
      A Boolean check whether we should show the Bookmark Icon
      what should not happen if the user is not logged in
      */
      showBookmark: {
        type: Boolean,
        required: false,
        default: true,
      },
    },
    data() {
      return {
        isMenuOpen: false,
        nextStepsAnimate: false,
      };
    },
    computed: {
      showMarkComplete() {
        return this.allowMarkComplete && this.contentProgress < 1;
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
        if (this.windowBreakpoint === 1) {
          maxSize = 2;
        } else if (this.windowBreakpoint > 1) {
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
        // The prime difference is that Exercises won't have shadows under the UiToolbar
        // because the LessonMasteryBar lives under it and has its own drop shadow.
        if (this.contentKind === ContentNodeKinds.EXERCISE) {
          return { border: `1px solid ${this.$themeTokens.fineLine}`, 'box-shadow': 'none' };
        } else {
          return {};
        }
      },
      isRTL() {
        return document.getElementsByTagName('html')[0].getAttribute('dir') === 'rtl' ? 'rtl' : {};
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
        if (!this.isMenuOpen) {
          return;
        }
        // close menu on outside click
        if (
          !this.$refs.menu.$el.contains(event.target) &&
          !this.$refs.moreOptionsButton.$el.contains(event.target)
        ) {
          this.closeMenu({ focusMoreOptionsButton: false });
        }
      },
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.menu.focusFirstEl();
        });
      },
      /*
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
      goBack: {
        message: 'Go back',
        context: 'Link to go back to the previous screen.',
      },
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

  /deep/ .ui-toolbar__body {
    flex-grow: 0; // make sure that the completion icon is right next to the title
    align-items: center;
  }

  /deep/ .progress-icon .ui-icon {
    margin-top: -2px;
    margin-left: 16px;

    svg {
      width: 18px;
      height: 18px;
    }
  }

  /deep/ .toolbar.rtl .icon {
    right: 0.625rem;
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

</style>
