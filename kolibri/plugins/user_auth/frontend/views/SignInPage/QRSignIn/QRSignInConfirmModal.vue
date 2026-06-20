<template>

  <KOverlay>
    <Backdrop class="confirm-backdrop" />
    <div
      class="modal-overlay"
      @mousedown.prevent
    >
      <div class="modal-wrapper">
        <KFocusTrap
          @shouldFocusFirstEl="modalTitle.focus()"
          @shouldFocusLastEl="confirmBtn.$el.focus()"
        >
          <div
            ref="modalCard"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-confirm-modal-title"
            class="modal-card"
            :style="{
              backgroundColor: $themeTokens.surface,
              zoom: cardScale < 1 ? cardScale : undefined,
            }"
          >
            <div
              class="header"
              :style="{ backgroundColor: $themePalette.yellow.v_500 }"
            >
              <h1
                id="qr-confirm-modal-title"
                ref="modalTitle"
                class="modal-title"
                tabindex="-1"
                :style="{ color: $themeTokens.text }"
              >
                {{ isThisYou$() }}
              </h1>

              <p
                class="learner-name"
                :style="{ color: $themeTokens.text }"
              >
                {{ learnerName }}
              </p>
            </div>

            <!--
              No credential to display (the QR token is secret) — show a clear
              summary line so the learner has something to verify besides the name.
            -->
            <div
              class="verify-section"
              :style="{ backgroundColor: $themePalette.grey.v_100 }"
            >
              <p
                class="verify-text"
                :style="{ color: $themeTokens.text }"
              >
                {{ verifyPrompt$() }}
              </p>
            </div>

            <div class="action-buttons">
              <div
                class="btn-bg"
                :class="
                  $computedClass({
                    backgroundColor: cancelBg,
                    ':hover': { backgroundColor: cancelBgHover },
                  })
                "
              >
                <KIconButton
                  icon="close"
                  :ariaLabel="noGoBack$()"
                  @click="$emit('cancel')"
                />
              </div>
              <div
                class="btn-bg"
                :class="
                  $computedClass({
                    backgroundColor: confirmBg,
                    ':hover': { backgroundColor: confirmBgHover },
                  })
                "
              >
                <KIconButton
                  ref="confirmBtn"
                  icon="check"
                  :color="$themePalette.white"
                  :ariaLabel="yesSignIn$()"
                  @click="$emit('confirm')"
                />
              </div>
            </div>
          </div>
        </KFocusTrap>
      </div>
    </div>
  </KOverlay>

</template>


<script>

  import { computed, onMounted, onUnmounted, ref } from 'vue';
  import { useWindowSize } from '@vueuse/core';
  import KFocusTrap from 'kolibri-design-system/lib/KFocusTrap';
  import KOverlay from 'kolibri-design-system/lib/KOverlay';
  import Backdrop from 'kolibri/components/Backdrop';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';
  import useReturnFocusOnUnmount from 'kolibri-common/composables/useReturnFocusOnUnmount';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { darken1 } from 'kolibri-design-system/lib/styles/darkenColors';

  export default {
    name: 'QRSignInConfirmModal',

    components: { KFocusTrap, KOverlay, Backdrop },

    setup() {
      useReturnFocusOnUnmount();
      const confirmBtn = ref(null);
      const modalTitle = ref(null);
      const modalCard = ref(null);
      const naturalCardHeight = ref(0);
      const { height: windowHeight } = useWindowSize();

      const cardScale = computed(() => {
        if (!naturalCardHeight.value) return 1;
        const available = windowHeight.value - 32; // 16px overlay padding each side
        return Math.min(1, available / naturalCardHeight.value);
      });
      const { isThisYou$, verifyPrompt$, yesSignIn$, noGoBack$ } = qrLoginStrings;
      const palette = themePalette();
      const cancelBg = palette.grey.v_200;
      const cancelBgHover = darken1(cancelBg);
      const confirmBg = palette.green.v_600;
      const confirmBgHover = darken1(confirmBg);

      onMounted(() => {
        document.documentElement.style.overflow = 'hidden';
        naturalCardHeight.value = modalCard.value.scrollHeight;
        confirmBtn.value.$el.focus();
      });

      onUnmounted(() => {
        document.documentElement.style.overflow = '';
      });

      return {
        confirmBtn,
        modalTitle,
        modalCard,
        cardScale,
        isThisYou$,
        verifyPrompt$,
        yesSignIn$,
        noGoBack$,
        cancelBg,
        cancelBgHover,
        confirmBg,
        confirmBgHover,
      };
    },

    props: {
      /**
       * Full name of the authenticated learner from the session API response.
       */
      learnerName: {
        type: String,
        required: true,
      },
    },

    emits: ['confirm', 'cancel'],
  };

</script>


<style lang="scss" scoped>

  .confirm-backdrop {
    z-index: 24;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 24;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .modal-wrapper {
    width: 100%;
    min-width: 0;
    max-width: 412px;
  }

  .modal-card {
    border-radius: 8px;
  }

  .header {
    padding: 24px;
    border-radius: 8px 8px 0 0;
  }

  .modal-title,
  .learner-name {
    margin: 0;
    font-weight: 600;
    text-align: center;
  }

  .modal-title {
    margin-bottom: 8px;
    font-size: 20px;
  }

  .learner-name {
    font-size: 32px;
  }

  .verify-section {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 32px;
    margin: 24px;
    border-radius: 8px;
  }

  .verify-text {
    margin: 0;
    font-size: 15px;
    text-align: center;
  }

  .action-buttons {
    display: flex;
    gap: 22px;
    justify-content: center;
    padding: 0 32px 32px;
  }

  .btn-bg {
    flex: 1;
    min-width: 0;
    border-radius: 8px;

    /deep/ button {
      width: 100% !important;
      height: 96px !important;
      padding: 16px !important;
      background-color: inherit !important;
      border-radius: 8px !important;

      svg {
        width: 48px !important;
        height: 48px !important;
      }
    }
  }

</style>
