<template>

  <div class="picture-password-option">
    <!--
      The label wraps the hidden checkbox and visible content, making the entire
      option region clickable/activatable while keeping a single focusable element.
    -->
    <label
      class="option-label"
      :class="[
        $computedClass(optionLabelStyles),
        $computedClass({
          ':focus-within': $coreOutline,
        }),
      ]"
    >
      <!--
        Native checkbox: visually hidden but keyboard-focusable.
        We do not set the `disabled` HTML attribute so the input keeps focus.
        `aria-disabled` communicates the disabled state to assistive technology.
      -->
      <input
        type="checkbox"
        class="visuallyhidden"
        :checked="isSelected"
        :aria-disabled="disabled ? 'true' : undefined"
        @click="onSelect"
        @keydown.enter.stop="onSelect"
      >

      <div
        class="icon-container"
        :style="iconContainerStyle"
      >
        <span
          v-if="isSelected"
          class="badge"
          aria-hidden="true"
          data-testid="badge"
          :style="{ backgroundColor: $themeTokens.primary, color: $themeTokens.textInverted }"
        >
          {{ sequencePosition }}
        </span>

        <KIcon
          class="option-icon"
          :icon="icon"
          :color="iconColor"
        />

        <span class="icon-label">
          {{ labelText }}
        </span>
      </div>
    </label>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswordStrings';

  export default {
    name: 'PicturePasswordOption',

    setup(props, { emit }) {
      const $themeTokens = themeTokens();
      const $themePalette = themePalette();

      const isSelected = computed(() => props.sequencePosition !== null);

      // Colorful icons have a fixed colour built into the icon itself, so applying
      // an additional colour tint would conflict and KIcon logs an error.
      const iconColor = computed(() =>
        isSelected.value && !props.icon.endsWith('Colorful') ? $themeTokens.primary : null,
      );

      const optionLabelStyles = computed(() => {
        if (isSelected.value) {
          return {
            border: `4px solid ${$themeTokens.primary}`,
            backgroundColor: $themePalette.blue.v_100,
            cursor: 'pointer',
            color: $themeTokens.text,
            fontWeight: 600,
          };
        }
        const unSelectedStyles = {
          border: `2px solid ${$themeTokens.fineLine}`,
          backgroundColor: $themePalette.grey.v_100,
          color: $themeTokens.annotation,
        };

        if (props.disabled) {
          return {
            ...unSelectedStyles,
            cursor: 'not-allowed',
          };
        }
        return {
          ...unSelectedStyles,
          cursor: 'pointer',
          ':hover': {
            borderColor: $themeTokens.primary,
            backgroundColor: $themePalette.blue.v_100,
          },
          ':hover .option-icon': {
            fill: $themeTokens.primary,
          },
        };
      });

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
        isSelected,
        iconColor,
        optionLabelStyles,
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
       * position in the selection sequence when this option is selected
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
    border-radius: 8px;
    transition:
      border-color $core-time,
      background-color $core-time;
  }

  .icon-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    justify-content: center;
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
    width: 52px;
    height: 52px;
  }

  .icon-label {
    font-size: 14px;
    text-align: center;
  }

</style>
