<template>

  <div
    class="modal-overlay"
    @mousedown.prevent
  >
    <KFocusTrap
      @shouldFocusFirstEl="modalTitle.focus()"
      @shouldFocusLastEl="confirmBtn.$el.focus()"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        class="modal-card"
        tabindex="-1"
        :style="{ backgroundColor: $themeTokens.surface }"
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
            :style="{ backgroundColor: cancelHovered ? cancelBgHover : cancelBg }"
            @mouseenter="cancelHovered = true"
            @mouseleave="cancelHovered = false"
          >
            <KIconButton
              icon="close"
              :ariaLabel="noGoBackAction$()"
              @click="$emit('cancel')"
            />
          </div>
          <div
            class="btn-bg"
            :style="{ backgroundColor: confirmHovered ? confirmBgHover : confirmBg }"
            @mouseenter="confirmHovered = true"
            @mouseleave="confirmHovered = false"
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

</template>


<script>

  import { computed, onMounted, ref } from 'vue';
  import KFocusTrap from 'kolibri-design-system/lib/KFocusTrap';
  import { PICTURE_PASSWORD_SET } from 'kolibri/constants';
  import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { darken1 } from 'kolibri-design-system/lib/styles/darkenColors';

  export default {
    name: 'PicturePasswordConfirmModal',

    components: { KFocusTrap },

    setup(props) {
      const confirmBtn = ref(null);
      const modalTitle = ref(null);
      const { isThisYou$, yourPasswordIs$, yesConfirmAction$, noGoBackAction$ } =
        picturePasswordStrings;
      const palette = themePalette();
      const cancelHovered = ref(false);
      const confirmHovered = ref(false);
      const cancelBg = palette.grey.v_200;
      const cancelBgHover = darken1(cancelBg);
      const confirmBg = palette.green.v_600;
      const confirmBgHover = darken1(confirmBg);

      const iconTokens = computed(() => {
        return props.picturePassword.split('.').map(idStr => {
          const entry = PICTURE_PASSWORD_SET[idStr];
          return props.iconStyle === PicturePasswordIconStyle.STANDARD
            ? entry.iconStandard
            : entry.iconColorful;
        });
      });

      const sequenceAriaLabel = computed(() => {
        const labels = props.picturePassword
          .split('.')
          .map(idStr => {
            const entry = PICTURE_PASSWORD_SET[idStr];
            return picturePasswordStrings[`${entry.name}$`]();
          })
          .join(', ');
        return yourPasswordIs$({ labels });
      });

      onMounted(() => {
        modalTitle.value.focus();
      });

      return {
        confirmBtn,
        modalTitle,
        iconTokens,
        sequenceAriaLabel,
        isThisYou$,
        yesConfirmAction$,
        noGoBackAction$,
        cancelHovered,
        confirmHovered,
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

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 24;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
  }

  .modal-card {
    width: max-content;
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
    border-radius: 8px;

    /deep/ button {
      width: 166px !important;
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
