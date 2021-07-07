<template>

  <UiToolbar>
    <KLabeledIcon :style="{ 'margin-top': '8px' }">
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
  </UiToolbar>

</template>


<script>

  import difference from 'lodash/difference';
  import KResponsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import { LearningActivities } from 'kolibri.coreVue.vuex.constants';
  import LearningActivityIcon from './LearningActivityIcon.vue';

  export default {
    name: 'LearningActivityBar',
    components: {
      CoreMenu,
      CoreMenuOption,
      UiToolbar,
      TextTruncator,
      LearningActivityIcon,
    },
    mixins: [KResponsiveWindowMixin],
    /**
     * Emits the following events:
     * - `navigateBack` on back button click
     * - `viewResourceList` on 'View lesson plan'/'View topic resources' click
     * - `toogleBookmark` on 'Save to bookmarks'/ 'Remove from bookmarks' click
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
        validator(arr) {
          const isValidLearningActivity = v => Object.values(LearningActivities).includes(v);
          return arr.length > 0 && arr.every(isValidLearningActivity);
        },
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
      };
    },
    computed: {
      allActions() {
        const actions = [
          {
            id: 'view-resource-list',
            icon: 'resourceList',
            label: this.isLessonContext
              ? this.$tr('viewLessonPlan')
              : this.$tr('viewTopicResources'),
            event: 'viewResourceList',
            dataTest: this.isLessonContext ? 'viewLessonPlanButton' : 'viewTopicResourcesButton',
          },
          {
            id: 'bookmark',
            icon: this.isBookmarked ? 'bookmark' : 'bookmarkEmpty',
            label: this.isBookmarked
              ? this.$tr('removeFromBookmarks')
              : this.$tr('saveToBookmarks'),
            event: 'toogleBookmark',
            dataTest: this.isBookmarked ? 'removeBookmarkButton' : 'addBookmarkButton',
          },
        ];
        if (this.allowMarkComplete) {
          actions.push({
            id: 'mark-complete',
            icon: 'star',
            iconColor: this.$themePalette.yellow.v_700,
            label: this.$tr('markResourceAsFinished'),
            event: 'markComplete',
            dataTest: 'markCompleteButton',
          });
        }
        actions.push({
          id: 'view-info',
          icon: 'info',
          label: this.$tr('viewInformation'),
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
      moreOptions: 'More options',
      viewLessonPlan: 'View lesson plan',
      viewTopicResources: 'View topic resources',
      removeFromBookmarks: 'Remove from bookmarks',
      saveToBookmarks: 'Save to bookmarks',
      markResourceAsFinished: 'Mark resource as finished',
      viewInformation: 'View information',
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
    right: 10px; // right-align to the menu icon
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

</style>
