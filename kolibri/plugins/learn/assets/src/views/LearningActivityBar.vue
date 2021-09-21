<template>

  <UiToolbar style="z-index: 8;">
    <CoachContentLabel
      :value="isCoachContent"
      style="margin-top: 8px; width: auto;"
    />
    <KLabeledIcon :style="{ 'margin-top': '8px', 'width': 'auto' }">
      <template #icon>
        <LearningActivityIcon
          data-test="learningActivityIcon"
          :kind="learningActivities"
          :shaded="true"
        />
      </template>
      <TextTruncator
        :text="resourceTitle"
        :maxHeight="26"
      />
      <template #iconAfter>
        <ProgressIcon :progress="contentProgress" class="progress-icon" />
      </template>
    </KLabeledIcon>

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
          :raised="true"
          :isOpen="isMenuOpen"
          :containFocus="true"
          @close="closeMenu"
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
    <MarkAsCompleteModal
      v-if="showMarkAsCompleteModal && allowMarkComplete"
      @complete="showMarkAsCompleteModal = false"
      @cancel="showMarkAsCompleteModal = false"
    />
  </UiToolbar>

</template>


<script>

  import { mapState } from 'vuex';
  import difference from 'lodash/difference';
  import KResponsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import { validateLearningActivity } from 'kolibri.utils.validators';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import LearningActivityIcon from './LearningActivityIcon.vue';
  import MarkAsCompleteModal from './MarkAsCompleteModal';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'LearningActivityBar',
    components: {
      CoachContentLabel,
      CoreMenu,
      CoreMenuOption,
      TextTruncator,
      LearningActivityIcon,
      MarkAsCompleteModal,
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
    },
    data() {
      return {
        isMenuOpen: false,
        showMarkAsCompleteModal: false,
      };
    },
    computed: {
      ...mapState({
        contentProgress: state => state.core.logging.summary.progress,
      }),
      ...mapState('topicsTree', {
        isCoachContent: state => (state.content.coach_content ? 1 : 0),
      }),
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
          {
            id: 'bookmark',
            icon: this.isBookmarked ? 'bookmark' : 'bookmarkEmpty',
            label: this.isBookmarked
              ? this.coreString('removeFromBookmarks')
              : this.coreString('saveToBookmarks'),
            event: 'toggleBookmark',
            disabled: this.isBookmarked === null,
            dataTest: this.isBookmarked ? 'removeBookmarkButton' : 'addBookmarkButton',
          },
        ];
        if (this.allowMarkComplete) {
          actions.push({
            id: 'mark-complete',
            icon: 'star',
            iconColor: this.$themePalette.yellow.v_700,
            label: this.learnString('markResourceAsCompleteLabel'),
            event: 'markComplete',
            dataTest: 'markCompleteButton',
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
      barActions() {
        const actions = [];
        if (this.windowBreakpoint >= 1) {
          actions.push(this.allActions.find(action => action.id === 'view-resource-list'));
        }
        if (this.windowBreakpoint >= 2) {
          actions.push(this.allActions.find(action => action.id === 'bookmark'));
          // if a resource doesn’t have the option for learners to manually mark as complete,
          // the 'More options' bar icon button changes to the 'View information' bar icon button
          if (!this.allowMarkComplete) {
            actions.push(this.allActions.find(action => action.id === 'view-info'));
          }
        }
        return actions;
      },
      menuActions() {
        return difference(this.allActions, this.barActions);
      },
    },
    created() {
      window.addEventListener('click', this.onWindowClick);
      this.$on('markComplete', () => (this.showMarkAsCompleteModal = true));
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
    },
    $trs: {
      goBack: 'Go back',
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
    padding-right: 16px;
  }

  .menu {
    position: absolute;
    top: 50%;
    right: 24px; // right-align to the menu icon
    z-index: 8;
    min-width: 270px;
    transform: translateY(16px);
  }

  // decrease the gap between the back navigation
  // icon and a resource icon + title
  /deep/ .ui-toolbar__left {
    .ui-toolbar__nav-icon {
      margin-right: 12px;
    }
  }

  // increase the gap between the resource title
  // and the action buttons on the right
  /deep/ .ui-toolbar__right {
    margin-left: 16px;
  }

  /deep/ .progress-icon .ui-icon {
    margin-top: -2px;

    svg {
      width: 18px;
      height: 18px;
    }
  }

</style>
