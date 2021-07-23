<template>

  <transition name="modal-fade" appear>
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
        :style="[ modalSizeStyles, { background: $themeTokens.surface } ]"
      >
        <FocusTrap
          :firstEl="firstFocusableEl"
          :lastEl="lastFocusableEl"
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
                {{ $tr('resourceCompleted') }}
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
              v-else
              class="stats"
            >
              <div class="points">
                <PointsIcon :style="{ display: 'inline-block' }" />
                <span :style="{ color: $themeTokens.correct }">
                  {{ $tr('plusPoints', { points }) }}
                </span>
              </div>
              <div>{{ $tr('keepUpTheGreatProgress') }}</div>
            </div>

            <CompletionModalSection
              v-if="nextContentNode"
              ref="nextContentNodeSection"
              :class="sectionClass"
              :title="$tr('moveOnTitle')"
              :description="$tr('moveOnDescription')"
              :buttonLabel="$tr('moveOnButtonLabel')"
              :buttonRoute="nextContentNodeRoute"
              icon="help"
            >
              <ResourceItem
                :contentNode="nextContentNode"
                size="small"
              />
              <template #icon>
                <svg
                  :class="{ 'rtl-icon': isRtl }"
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <!-- eslint-disable-next-line -->
                  <path d="M15.9997 10.6677V8.54767C15.9997 7.361 17.4397 6.761 18.2797 7.601L25.733 15.0543C26.253 15.5743 26.253 16.4143 25.733 16.9343L18.2797 24.3877C17.4397 25.2277 15.9997 24.641 15.9997 23.4543V21.3343H6.66634C5.93301 21.3343 5.33301 20.7343 5.33301 20.001V12.001C5.33301 11.2677 5.93301 10.6677 6.66634 10.6677H15.9997Z" fill="black" />
                </svg>
              </template>
            </CompletionModalSection>

            <CompletionModalSection
              ref="staySection"
              :class="sectionClass"
              :title="$tr('stayTitle')"
              :description="$tr('stayDescription')"
              :buttonLabel="$tr('stayButtonLabel')"
              icon="help"
              @buttonClick="$emit('close')"
            >
              <template #icon>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <!-- eslint-disable-next-line -->
                  <path d="M15.9993 6.66671V4.28004C15.9993 3.68004 15.2793 3.38671 14.8659 3.81337L11.1326 7.53337C10.866 7.80004 10.866 8.21337 11.1326 8.48004L14.8526 12.2C15.2793 12.6134 15.9993 12.32 15.9993 11.72V9.33337C20.4126 9.33337 23.9993 12.92 23.9993 17.3334C23.9993 20.96 21.5593 24.0267 18.2526 25C17.6926 25.16 17.3326 25.6934 17.3326 26.2667C17.3326 27.1334 18.1593 27.8134 18.9993 27.56C23.4259 26.2667 26.6659 22.1867 26.6659 17.3334C26.6659 11.44 21.8926 6.66671 15.9993 6.66671Z" fill="black" />
                  <!-- eslint-disable-next-line -->
                  <path d="M7.99967 17.3334C7.99967 15.5468 8.58634 13.8934 9.58634 12.5468C9.98634 12.0134 9.93301 11.2801 9.46634 10.8001C8.90634 10.2401 7.94634 10.2934 7.46634 10.9334C6.13301 12.7201 5.33301 14.9334 5.33301 17.3334C5.33301 22.1868 8.57301 26.2668 12.9997 27.5601C13.8397 27.8134 14.6663 27.1335 14.6663 26.2668C14.6663 25.6935 14.3063 25.1601 13.7463 25.0001C10.4397 24.0268 7.99967 20.9601 7.99967 17.3334Z" fill="black" />
                </svg>
              </template>
            </CompletionModalSection>

            <CompletionModalSection
              v-if="recommendedContentNodes && recommendedContentNodes.length"
              :class="sectionClass"
              :title="$tr('helpfulResourcesTitle')"
              :description="$tr('helpfulResourcesDescription')"
              icon="help"
            >
              <template #icon>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <!-- eslint-disable-next-line -->
                  <path d="M13.0399 14.8803L11.1466 16.7736C10.2399 15.8536 9.35992 14.6669 8.75992 12.8536L11.3466 12.2003C11.7733 13.3869 12.3733 14.2003 13.0399 14.8803ZM13.5333 6.86693L9.79992 3.13359C9.53325 2.86693 9.11992 2.86693 8.85325 3.13359L5.13325 6.86693C4.71992 7.28026 5.01325 8.00026 5.61325 8.00026H8.02659C8.05325 9.08026 8.13325 10.0536 8.27992 10.8936L10.8666 10.2403C10.7733 9.60026 10.7066 8.84026 10.6933 8.00026H13.0666C13.6533 8.00026 13.9466 7.28026 13.5333 6.86693ZM26.8666 6.86693L23.1466 3.14693C22.8799 2.88026 22.4666 2.88026 22.1999 3.14693L18.4799 6.86693C18.0533 7.28026 18.3466 8.00026 18.9466 8.00026H21.3199C21.1866 12.9069 19.6133 14.3336 17.9333 15.8403C17.2666 16.4269 16.5866 17.0669 15.9999 17.9069C15.5466 17.2536 15.0266 16.7336 14.4933 16.2536L12.6133 18.1336C13.8533 19.2669 14.6666 20.1869 14.6666 22.6669V28.0003C14.6666 28.7336 15.2666 29.3336 15.9999 29.3336C16.7333 29.3336 17.3333 28.7336 17.3333 28.0003V22.6669C17.3333 19.9736 18.2799 19.1203 19.7199 17.8269C21.5599 16.1736 23.8266 14.1203 23.9866 8.00026H26.3866C26.9866 8.00026 27.2799 7.28026 26.8666 6.86693Z" fill="black" />
                </svg>
              </template>

              <KGrid>
                <KGridItem
                  v-for="contentNode in recommendedContentNodes"
                  :key="contentNode.id"
                  :layout12="{ span: 6 }"
                  :layout8="{ span: 4 }"
                  :layout4="{ span: 4 }"
                  :style="{ marginTop: '16px' } "
                >
                  <ResourceItem
                    :contentNode="contentNode"
                    :contentNodeRoute="genContentLink(contentNode.id, contentNode.is_leaf)"
                    :size="recommendedResourceItemSize"
                    :style="{ marginBottom: '24px' }"
                  />
                </KGridItem>
              </KGrid>
            </CompletionModalSection>
          </div>

          <KIconButton
            ref="closeButton"
            class="close-button"
            icon="close"
            :ariaLabel="$tr('close')"
            :tooltip="$tr('close')"
            @click="$emit('close')"
          />
        </FocusTrap>
      </div>
    </div>
  </transition>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import { MaxPointsPerContent } from 'kolibri.coreVue.vuex.constants';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import FocusTrap from 'kolibri.coreVue.components.FocusTrap';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import CompletionModalSection from './CompletionModalSection';
  import ResourceItem from './ResourceItem';

  /**
   * A modal displayed after finishing a learning activity
   * where users can decide to continue to a next activity,
   * stay, or check recommended resources.
   *
   * A customized `KModal` fork (it deviates too much
   * for us to be able to use `KModal` and we don't want
   * to update KDS because this may be the only modal
   * built around different patterns)
   */
  export default {
    name: 'CompletionModal',
    components: {
      FocusTrap,
      PointsIcon,
      CompletionModalSection,
      ResourceItem,
      UiAlert,
    },
    mixins: [KResponsiveWindowMixin],
    props: {
      isUserLoggedIn: {
        type: Boolean,
        required: true,
      },
      nextContentNode: {
        type: Object,
        required: false,
        default: null,
      },
      /**
       * vue-router link object
       */
      nextContentNodeRoute: {
        type: Object,
        required: false,
        default: null,
      },
      recommendedContentNodes: {
        type: Array,
        required: false,
        default: null,
      },
      genContentLink: {
        type: Function,
        required: false,
        default: () => null,
        validator(fn) {
          const link = fn(1, false);
          return validateLinkObject(link);
        },
      },
    },
    data() {
      return {
        // to be used by the modal focus trap
        firstFocusableEl: null,
        lastFocusableEl: null,
        // where the focus was before opening the modal
        // so we can return it back after it's closed
        lastFocus: null,
      };
    },
    computed: {
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
            borderBottom: `1px solid ${this.$themePalette.grey.v_300}`,
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
    },
    beforeMount() {
      this.lastFocus = document.activeElement;
    },
    mounted() {
      // Remove scrollbars from the <html> tag, so user's can't scroll while modal is open
      window.document.documentElement.style['overflow'] = 'hidden';
      this.$nextTick(() => {
        if (this.$refs.modal && !this.$refs.modal.contains(document.activeElement)) {
          this.focusModal();
        }

        if (this.nextContentNode) {
          this.firstFocusableEl = this.$refs.nextContentNodeSection.$refs.button.$el;
        } else {
          this.firstFocusableEl = this.$refs.staySection.$refs.button.$el;
        }
        this.lastFocusableEl = this.$refs.closeButton.$el;
      });
      window.addEventListener('focus', this.focusElementTest, true);
    },
    destroyed() {
      // Restore scrollbars to <html> tag
      window.document.documentElement.style['overflow'] = '';
      window.removeEventListener('focus', this.focusElementTest, true);
      // Wait for events to finish propagating before changing the focus.
      // Otherwise the `lastFocus` item receives events such as 'enter'.
      // (setTimeout(fn, 0) will execute the next event cycle, as soon as the main thread stack
      // is empty, not immediately. See note in
      // https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Timeouts_and_intervals#settimeout)
      window.setTimeout(() => this.lastFocus.focus());
    },
    methods: {
      emitCloseEvent() {
        this.$emit('close');
      },
      goToNextContentNode() {
        this.$router.push(this.nextContentNodeRoute);
      },
      focusModal() {
        this.$refs.modal.focus();
      },
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
        // focus has escaped the modal - put it back!
        if (!this.$refs.modal.contains(target)) {
          this.focusModal();
        }
      },
    },
    $trs: {
      signIn: 'Sign in or create an account to begin earning points',
      resourceCompleted: 'Resource completed',
      plusPoints: '+ { points, number } points',
      keepUpTheGreatProgress: 'Keep up the great progress!',
      close: 'Close',
      moveOnTitle: 'Keep going',
      moveOnDescription: 'Move on to the next resource in the topic',
      moveOnButtonLabel: 'Move on',
      stayTitle: 'Stay and practice',
      stayDescription: 'Stay on this resource to keep practicing',
      stayButtonLabel: 'Stay here',
      helpfulResourcesTitle: 'You may find helpful',
      helpfulResourcesDescription: 'Here are some related resources we think you’ll find helpful',
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

</style>
