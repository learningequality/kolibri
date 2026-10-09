<template>

  <div class="picture-password-option">
    <!--
      The label wraps the hidden checkbox and visible content, making the entire
      option region clickable/activatable while keeping a single focusable element.
    -->
    <label
      :for="checkboxId"
      class="option-label"
      :class="{
        selected: isSelected,
        disabled: disabled && !isSelected,
        hoverable: !isSelected && !disabled,
      }"
    >
      <!--
        Native checkbox: visually hidden but keyboard-focusable.
        We do not set the `disabled` HTML attribute so the input keeps focus.
        `aria-disabled` communicates the disabled state to assistive technology.
      -->
      <input
        :id="checkboxId"
        type="checkbox"
        class="visuallyhidden"
        :checked="isSelected"
        :aria-disabled="disabled ? 'true' : undefined"
        @click="onSelect"
        @keydown.enter.stop="onSelect"
      >

      <div
        class="icon-container"
        :class="{
          'show-icon-text': showIconText,
        }"
        :style="iconContainerStyle"
      >
        <span
          v-if="isSelected"
          class="badge"
          aria-hidden="true"
          data-testid="badge"
          :style="{ backgroundColor: 'var(--tokens-primary)', color: 'var(--tokens-textInverted)' }"
        >
          {{ sequencePosition }}
        </span>

        <div class="icon-wrapper">
          <KIcon
            class="option-icon"
            :icon="icon"
            :color="iconColor"
          />
        </div>

        <span
          class="icon-label"
          :class="{ visuallyhidden: !showIconText }"
        >
          {{ labelText }}
        </span>
      </div>
    </label>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';

  export default {
    name: 'PicturePasswordOption',

    setup(props, { emit }) {
      const $themeTokens = themeTokens();

      // Unique per page because the parent (PicturePasswordGrid) renders each icon exactly once.
      const checkboxId = `picture-password-option-${props.icon}`;

      const isSelected = computed(() => props.sequencePosition !== null);

      // Colorful icons have a fixed colour built into the icon itself, so applying
      // an additional colour tint would conflict and KIcon logs an error.
      const iconColor = computed(() =>
        isSelected.value && !props.icon.endsWith('Colorful') ? $themeTokens.primary : null,
      );

      const labelText = computed(() => {
        const getter = picturePasswordStrings[`${props.iconName}$`];
        return getter ? getter() : props.iconName;
      });

      const iconContainerStyle = computed(() => {
        if (!props.disabled) return {};
        return { filter: 'grayscale(100%)', opacity: '0.4' };
      });

      const onSelect = e => {
        if (props.disabled) {
          // Prevent the default browser behavior of toggling the checkbox.
          // This is needed only on `disabled`, because we are still allowing the native click
          // and keyboard events to occur on the input element. When not disabled, we want the
          // checkbox to toggle normally and emit the select event.
          e.preventDefault();
          emit('disabledSelect');
        } else {
          emit('select', props.icon);
        }
      };

      return {
        checkboxId,
        isSelected,
        iconColor,
        labelText,
        iconContainerStyle,
        onSelect,
      };
    },

    props: {
      /**
       * Resolved KIcon token to display (e.g. "birdColorful" or "birdStandard").
       */
      icon: {
        type: String,
        required: true,
      },
      /**
       * Icon object name (e.g. "bird") used to look up the translated label.
       */
      iconName: {
        type: String,
        required: true,
      },
      /**
       * Position in the selection sequence when this option is selected
       * or null when unselected.
       */
      sequencePosition: {
        type: Number,
        default: null,
        validator: value => value === null || [1, 2, 3].includes(value),
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * Whether to display the translated icon name below the icon.
       */
      showIconText: {
        type: Boolean,
        default: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  $badge-size: 32px;
  $selected-border-width: 4px;

  .picture-password-option {
    display: inline-flex;
    min-width: 44px;
    min-height: 44px;
  }

  /* The label is the interactive surface */
  .option-label {
    position: relative;
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: 12px;
    color: var(--tokens-annotation);
    cursor: pointer;
    background-color: var(--palette-grey-v100);
    border: 2px solid var(--tokens-fineLine);
    border-radius: 8px;
    transition:
      border-color $core-time,
      background-color $core-time;

    &.selected {
      // reduce padding to keep overall option size consistent when border width increases
      padding: 10px;
      font-weight: 600;
      color: var(--tokens-text);
      background-color: var(--palette-blue-v100);
      border: $selected-border-width solid var(--tokens-primary);
    }

    &.disabled {
      cursor: not-allowed;
    }

    &.hoverable:hover {
      background-color: var(--palette-blue-v100);
      border-color: var(--tokens-primary);

      // KIcon sets its fill as an inline style, which only !important can override
      .option-icon {
        fill: var(--tokens-primary) !important;
      }
    }
  }

  // The focus lands on the visually hidden checkbox, so the outline goes on the label.
  // Like $coreOutline, it only shows when navigating with the keyboard.
  body[modality='keyboard'] .option-label:focus-within {
    outline: 3px solid var(--tokens-focusOutline);
    outline-offset: 4px;
  }

  .icon-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;

    .icon-wrapper {
      display: flex;
      width: 100%;
      height: 100%;
    }

    // Add horizontal padding to the icon when the label text is shown to make the icon smaller,
    // so that the overall option is a square when we have a one-line label (most of the cases).
    // Given that the icon element is always going to be a square, by setting some horizontal
    // padding, we make its width smaller, making its height smaller
    &.show-icon-text .icon-wrapper {
      padding: 0 12px;
    }
  }

  .badge {
    position: absolute;
    // Position the badge centered on the top-left corner of the option, just outside the border.
    top: #{-1 * ($badge-size / 2 + $selected-border-width / 2)};
    left: #{-1 * ($badge-size / 2 + $selected-border-width / 2)};
    display: flex;
    align-items: center;
    justify-content: center;
    width: $badge-size;
    height: $badge-size;
    font-size: 16px;
    font-weight: bold;
    border-radius: 50%;
  }

  .option-icon {
    top: 0;
    // Ensure responsiveness by setting icon size based on parent grid cell size
    width: 100%;
    height: 100%;
  }

  .icon-label {
    font-size: 14px;
    text-align: center;
    word-break: break-all;
  }

</style>
