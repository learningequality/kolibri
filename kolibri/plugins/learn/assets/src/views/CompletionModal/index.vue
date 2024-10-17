<template>

  <transition
    name="modal-fade"
    appear
  >
    <div
      class="modal-overlay"
      @keyup.esc.stop="emitCloseEvent"
      @keyup.enter="goToNextContentNode"
    >
      <div
        ref="modal"
        class="modal"
        :tabindex="0"
        role="dialog"
        aria-labelledby="modal-title"
        :style="[modalSizeStyles, { background: $themeTokens.surface }]"
      >
        <KFocusTrap
          @shouldFocusFirstEl="$emit('shouldFocusFirstEl')"
          @shouldFocusLastEl="focusLastEl"
        >
          <KFixedGrid
            :numCols="12"
            :style="{ margin: '24px' }"
          >
            <KFixedGridItem :span="9">
              <h1
                id="modal-title"
                class="title"
              >
                {{ learnString('resourceCompletedLabel') }}
              </h1>
            </KFixedGridItem>
            <KFixedGridItem
              :span="3"
              alignment="right"
            >
              <!--
                leave some space for absolutely positioned close button
                to avoid overlapping with the title (the button markup is
                at the end of the modal to achieve correct focus order
                without the need to set specific tabindex on all focusable
                elements)
              -->
            </KFixedGridItem>
          </KFixedGrid>

          <div :style="contentStyle">
            <UiAlert
              v-if="!isUserLoggedIn"
              :dismissible="false"
              :removeIcon="true"
              type="warning"
              :style="{ marginTop: '8px' }"
            >
              {{ $tr('signIn') }}
            </UiAlert>
            <div
              v-else-if="!wasComplete"
              class="stats"
            >
              <div class="points">
                <span :style="{ color: $themeTokens.correct }">
                  {{ $tr('plusPoints', { points }) }}
                </span>
                <KIcon
                  icon="pointsActive"
                  :style="{ display: 'inline-block' }"
                  :color="$themeTokens.primary"
                />
              </div>
              <div>{{ $tr('keepUpTheGreatProgress') }}</div>
            </div>
            <KCircularLoader
              v-if="loading"
              class="loader"
            />
            <template v-else>
              <CompletionModalSection
                v-if="nextContentNode"
                ref="nextContentNodeSection"
                icon="forwardRounded"
                :class="sectionClass"
                :title="$tr('moveOnTitle')"
                :description="$tr('moveOnDescription')"
                :buttonLabel="$tr('moveOnButtonLabel')"
                :buttonRoute="nextContentNodeRoute"
              >
                <ResourceItem
                  :contentNode="nextContentNode"
                  size="small"
                />
              </CompletionModalSection>

              <CompletionModalSection
                ref="staySection"
                :icon="isQuiz || isSurvey ? 'reports' : 'restart'"
                :class="sectionClass"
                :title="staySectionTitle"
                :description="staySectionDescription"
                :buttonLabel="
                  isQuiz || isSurvey ? $tr('reviewQuizButtonLabel') : $tr('stayButtonLabel')
                "
                @buttonClick="$emit('close')"
              />

              <CompletionModalSection
                v-if="recommendedContentNodes && recommendedContentNodes.length"
                icon="alternativeRoute"
                :class="sectionClass"
                :title="$tr('helpfulResourcesTitle')"
                :description="$tr('helpfulResourcesDescription')"
              >
                <KGrid :style="{ marginTop: '6px' }">
                  <KGridItem
                    v-for="node in recommendedContentNodes"
                    :key="node.id"
                    :layout12="{ span: 6 }"
                    :layout8="{ span: 4 }"
                    :layout4="{ span: 4 }"
                    :style="{ marginBottom: '24px' }"
                  >
                    <ResourceItem
                      data-test="recommended-resource"
                      :contentNode="node"
                      :contentNodeRoute="genContentLinkKeepCurrentBackLink(node.id, node.is_leaf)"
                      :size="recommendedResourceItemSize"
                    />
                  </KGridItem>
                </KGrid>
              </CompletionModalSection>
            </template>
          </div>

          <KIconButton
            ref="closeButton"
            class="close-button"
            icon="close"
            :ariaLabel="coreString('closeAction')"
            :tooltip="coreString('closeAction')"
            @click="$emit('close')"
          />
        </KFocusTrap>
      </div>
    </div>
  </transition>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import { MaxPointsPerContent } from 'kolibri.coreVue.vuex.constants';
  import FocusTrap from 'kolibri.coreVue.components.FocusTrap';
  import { ContentNodeResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import { currentDeviceData } from '../../composables/useDevices';
  import useDeviceSettings from '../../composables/useDeviceSettings';
  import useLearnerResources from '../../composables/useLearnerResources';
  import useContentLink from '../../composables/useContentLink';
  import commonLearnStrings from '../commonLearnStrings';
  import CompletionModalSection from './CompletionModalSection';
  import ResourceItem from './ResourceItem';

  /**
   * A modal displayed after finishing a learning activity
   * where users can decide to continue to a next activity,
   * stay, or navigate to one of the recommended resources.
   *
   * A customized `KModal` fork (it deviates too much
   * for us to be able to use `KModal` and we don't want
   * to update KDS because this may be the only modal
   * following different patterns)
   */
  export default {
    name: 'CompletionModal',
    components: {
      FocusTrap,
      CompletionModalSection,
      ResourceItem,
      UiAlert,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    setup() {
      const { canAccessUnassignedContent } = useDeviceSettings();
      const { fetchLesson } = useLearnerResources();
      const { genContentLinkKeepCurrentBackLink } = useContentLink();
      const { baseurl } = currentDeviceData();
      const { windowBreakpoint, windowHeight, windowWidth } = useKResponsiveWindow();
      const { isAdmin, isCoach, isSuperuser } = useUser();
      return {
        baseurl,
        canAccessUnassignedContent,
        fetchLesson,
        genContentLinkKeepCurrentBackLink,
        windowBreakpoint,
        windowHeight,
        windowWidth,
        isAdmin,
        isCoach,
        isSuperuser,
      };
    },
    props: {
      /**
       * A sign-in prompt is displayed if a user
       * is not logged in for them to be able to earn points
       * for completing the activity.
       */
      isUserLoggedIn: {
        type: Boolean,
        required: true,
      },
      contentNode: {
        type: Object,
        required: true,
      },
      lessonId: {
        type: String,
        default: null,
      },
      isQuiz: {
        type: Boolean,
        default: false,
      },
      isSurvey: {
        type: Boolean,
        default: false,
      },
      wasComplete: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        // where the focus was before opening the modal
        // so we can return it back after it's closed
        lastFocus: null,
        /**
         * If there is at least one resource in this array
         * of recommended resources, "You may find helpful"
         * section is displayed and a user can navigate to one
         * of the resources.
         */
        recommendedContentNodes: [],
        /**
         * If there is a resource following the current resource,
         * "Keep going" section is displayed and a user can navigate
         * to the next resource
         */
        nextContentNode: null,
        loading: true,
      };
    },
    computed: {
      contentNodeId() {
        return this.contentNode && this.contentNode.id;
      },
      staySectionDescription() {
        if (this.isQuiz) {
          return this.$tr('reviewQuizDescription');
        }
        if (this.isSurvey) {
          return this.$tr('reviewSurveyDescription');
        }
        return this.$tr('stayDescription');
      },
      staySectionTitle() {
        if (this.isQuiz) {
          return this.$tr('reviewQuizTitle');
        }
        if (this.isSurvey) {
          return this.$tr('reviewSurveyTitle');
        }
        return this.$tr('stayTitle');
      },
      points() {
        return MaxPointsPerContent;
      },
      modalSizeStyles() {
        let maxWidth = this.maxModalWidth;
        let maxHeight = this.windowHeight;

        if (this.windowBreakpoint > 1) {
          maxWidth -= 32;
          maxHeight -= 32;
        }

        return {
          maxWidth: maxWidth + 'px',
          maxHeight: maxHeight + 'px',
        };
      },
      maxModalWidth() {
        if (this.windowWidth < 1000) {
          return this.windowWidth;
        }
        return 1000;
      },
      contentStyle() {
        return {
          overflowX: 'hidden',
          padding: this.windowBreakpoint < 2 ? '0 24px' : '0 54px',
        };
      },
      sectionClass() {
        return this.$computedClass({
          ':not(:last-child)': {
            borderBottom: `1px solid ${this.$themePalette.grey.v_400}`,
          },
        });
      },
      recommendedResourceItemSize() {
        if (this.windowBreakpoint > 1) {
          return 'large';
        } else if (this.windowBreakpoint > 0) {
          return 'medium';
        } else {
          return 'small';
        }
      },
      nextContentNodeRoute() {
        return this.genContentLinkKeepCurrentBackLink(
          this.nextContentNode.id,
          this.nextContentNode.is_leaf,
        );
      },
    },
    created() {
      const promises = [];
      if (this.lessonId) {
        promises.push(this.loadNextLessonContent());
      } else if (this.canAccessUnassignedContent) {
        promises.push(this.loadNextContent());
      }
      if (this.canAccessUnassignedContent) {
        promises.push(this.loadRecommendedContent());
      }
      Promise.all(promises).then(() => {
        this.loading = false;
      });
    },
    beforeMount() {
      this.lastFocus = document.activeElement;
    },
    mounted() {
      // Remove scrollbars from the <html> tag, so user's can't scroll while modal is open
      window.document.documentElement.style['overflow'] = 'hidden';
      this.$nextTick(() => {
        this.focusFirstEl();
      });
    },
    destroyed() {
      // Restore scrollbars to <html> tag
      window.document.documentElement.style['overflow'] = '';
      // Wait for events to finish propagating before changing the focus.
      // Otherwise the `lastFocus` item receives events such as 'enter'.
      // (setTimeout(fn, 0) will execute the next event cycle, as soon as the main thread stack
      // is empty, not immediately. See note in
      // https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Timeouts_and_intervals#settimeout)
      window.setTimeout(() => this.lastFocus.focus());
    },
    methods: {
      focusLastEl() {
        this.$el.querySelector('.close-button').focus();
      },
      loadNextContent() {
        const fetchGrandparent = this.contentNode.ancestors.length > 1;
        const treeParams = {
          id: fetchGrandparent
            ? this.contentNode.ancestors.slice(-2)[0].id
            : this.contentNode.parent,
          params: {
            include_coach_content: this.isAdmin || this.isCoach || this.isSuperuser,
            depth: fetchGrandparent ? 2 : 1,
            baseurl: this.baseurl,
          },
        };
        return ContentNodeResource.fetchTree(treeParams).then(ancestor => {
          let parent;
          if (fetchGrandparent) {
            parent = ancestor.children.results.find(c => c.id === this.contentNode.parent);
          } else {
            parent = ancestor;
          }
          const contentIndex = parent.children.results.findIndex(c => c.id === this.contentNode.id);
          this.nextContentNode = parent.children.results.slice(contentIndex + 1)[0] || null;
        });
      },
      loadRecommendedContent() {
        if (!this.baseurl) {
          return ContentNodeResource.fetchRecommendationsFor(this.contentNodeId).then(data => {
            this.recommendedContentNodes = data;
          });
        }
      },
      loadNextLessonContent() {
        return this.fetchLesson({ lessonId: this.lessonId }).then(lesson => {
          const index = lesson.resources.findIndex(c => c.contentnode_id === this.contentNodeId);
          this.nextContentNode = lesson.resources[index + 1]
            ? lesson.resources[index + 1].contentnode
            : null;
        });
      },
      emitCloseEvent() {
        this.$emit('close');
      },
      goToNextContentNode() {
        this.$router.push(this.nextContentNodeRoute);
      },
      /**
       * @public
       * Focuses on correct first element for FocusTrap depending on content
       * rendered in CompletionModal.
       */
      focusElementTest(event) {
        const { target } = event;
        const noopOnFocus =
          target === window || // switching apps
          !this.$refs.modal || // if $refs.modal isn't available
          target === this.$refs.modal || // addresses #3824
          this.$refs.modal.contains(target.activeElement);
        if (noopOnFocus) {
          return;
        }
        // Fixes possible infinite recursion when disconnection
        // snackbars appear along with the modal (#6301)
        const $coreSnackbar = document.getElementById('coresnackbar');
        if ($coreSnackbar && $coreSnackbar.contains(target)) {
          return;
        }
        // If there is an open KModal, the base case allows us to avoid
        // the infinite recursion caused by trying to focus trap the KModal
        const $coreModal = document.getElementById('modal-window');
        if ($coreModal && $coreModal.contains(target)) {
          return;
        }
        // focus has escaped the modal - put it back!
        if (!this.$refs.modal.contains(target)) {
          this.focusModal();
        }
      },
      focusFirstEl() {
        if (this.nextContentNode && this.$refs.nextContentNodeSection) {
          this.$refs.nextContentNodeSection.getButtonRef().$el.focus();
        } else if (this.$refs.staySection) {
          this.$refs.staySection.getButtonRef().$el.focus();
        }
      },
    },
    $trs: {
      signIn: {
        message: 'Sign in or create an account to begin earning points',
        context:
          'Message that a learner will see upon completing a resource if they are not signed in to Kolibri.',
      },
      plusPoints: {
        message: '+ { points, number } points',
        context: 'Indicates the amount of points awarded to the learner for completing a resource.',
      },
      keepUpTheGreatProgress: {
        message: 'Keep up the great progress!',
        context: 'Message of encouragement which displays when learner has completed a resource.',
      },
      moveOnTitle: {
        message: 'Keep going',
        context: 'Message to the user after completing a resource, to select the next resource.',
      },
      moveOnDescription: {
        message: 'Move on to the next resource in the folder',
        context: 'Message to the user after completing a resource in a folder.',
      },
      moveOnButtonLabel: {
        message: 'Move on',
        context:
          'Label for a button used if learner decides to move forward to the following resource.',
      },
      stayTitle: {
        message: 'Stay and practice',
        context: 'Message to the user to continue practicing after they completed a resource.',
      },
      stayDescription: {
        message: 'Stay on this resource to keep practicing',
        context: "Description on 'Resource completed' window.",
      },
      stayButtonLabel: {
        message: 'Stay here',
        context: 'Label for a button used if learner decides to repeat the completed resource.',
      },
      reviewSurveyTitle: {
        message: 'Review survey',
        context: 'Message to the user to review a survey after they completed it.',
      },
      reviewSurveyDescription: {
        message: 'Open the survey report to review your answers',
        context: 'After learner submitted a survey, they can view the report page.',
      },
      reviewQuizTitle: {
        message: 'Review quiz',
        context: 'Message to the user to review a quiz after they completed it.',
      },
      reviewQuizDescription: {
        message: 'Open the quiz report to review your answers',
        context: 'After learner submitted a practice quiz, they can view the report page.',
      },
      reviewQuizButtonLabel: {
        message: 'View report',
        context: 'Label for a button used if learner decides to view the practice quiz report.',
      },
      helpfulResourcesTitle: {
        message: 'You may find helpful',
        context: 'Message to the user after completing a resource with additional suggestions.',
      },
      helpfulResourcesDescription: {
        message: "Here are some related resources we think you'll find helpful",
        context: "Description on the 'Resource completed' window.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 24;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    background-attachment: fixed;
    transition: opacity $core-time ease;
  }

  .modal {
    @extend %dropshadow-16dp;
    @extend %momentum-scroll;

    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    margin: 0 auto;
    overflow-y: auto;
    border-radius: $radius;
    transform: translate(-50%, -50%);

    &:focus {
      outline: none;
    }
  }

  .modal-fade-enter-active,
  .modal-fade-leave-active {
    transition: all $core-time ease;
  }

  .modal-fade-enter,
  .modal-fade-leave-active {
    opacity: 0;
  }

  .title {
    margin: 0;
    font-size: 24px;
  }

  .close-button {
    position: absolute;
    top: 20px;
    right: 20px;
  }

  .stats {
    font-size: 18px;
    font-weight: bold;
    text-align: center;

    .points {
      font-size: 24px;
    }
  }

  .loader {
    margin-top: 56px;
    margin-bottom: 56px;
  }

</style>
