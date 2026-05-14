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
            aria-labelledby="confirm-modal-title"
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
                id="confirm-modal-title"
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

            <span class="visuallyhidden">{{ sequenceAriaLabel }}</span>
            <div
              class="icon-sequence"
              aria-hidden="true"
              :style="{ backgroundColor: $themePalette.grey.v_100 }"
            >
              <KIcon
                v-for="(iconToken, i) in iconTokens"
                :key="i"
                class="seq-icon"
                :icon="iconToken"
              />
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
                  :ariaLabel="noGoBackAction$()"
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
                  :ariaLabel="yesConfirmAction$()"
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
  import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import { getPicturePasswordIcons } from 'kolibri-common/utils/picturePassword';
  import useReturnFocusOnUnmount from 'kolibri-common/composables/useReturnFocusOnUnmount';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { darken1 } from 'kolibri-design-system/lib/styles/darkenColors';

  export default {
    name: 'PicturePasswordConfirmModal',

    components: { KFocusTrap, KOverlay, Backdrop },

    setup(props) {
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
      const { isThisYou$, yourPasswordIs$, yesConfirmAction$, noGoBackAction$ } =
        picturePasswordStrings;
      const palette = themePalette();
      const cancelBg = palette.grey.v_200;
      const cancelBgHover = darken1(cancelBg);
      const confirmBg = palette.green.v_600;
      const confirmBgHover = darken1(confirmBg);

      const passwordIcons = computed(() =>
        getPicturePasswordIcons(props.picturePassword, props.iconStyle),
      );

      const iconTokens = computed(() => passwordIcons.value.map(item => item.iconName));

      const sequenceAriaLabel = computed(() => {
        const labels = passwordIcons.value
          .map(item => picturePasswordStrings[`${item.label}$`]())
          .join(', ');
        return yourPasswordIs$({ labels });
      });

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
        iconTokens,
        sequenceAriaLabel,
        isThisYou$,
        yesConfirmAction$,
        noGoBackAction$,
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
      /**
       * Dot-separated picture password sequence string (e.g. "1.2.3").
       */
      picturePassword: {
        type: String,
        required: true,
      },
      /**
       * Icon style variant: 'colorful' or 'standard'.
       */
      iconStyle: {
        type: String,
        default: PicturePasswordIconStyle.COLORFUL,
        validator: value => Object.values(PicturePasswordIconStyle).includes(value),
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

  .icon-sequence {
    display: flex;
    gap: 24px;
    align-items: center;
    justify-content: center;
    padding: 16px 32px;
    margin: 32px;
    border-radius: 8px;
  }

  .seq-icon {
    width: 80px;
    height: 80px;
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
