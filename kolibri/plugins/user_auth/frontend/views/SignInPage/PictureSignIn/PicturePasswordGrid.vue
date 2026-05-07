<template>

  <div class="picture-password-grid">
    <div
      class="icon-grid"
      :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
    >
      <PicturePasswordOption
        v-for="iconData in icons"
        :key="iconData.id"
        :icon="iconData.iconToken"
        :iconName="iconData.name"
        :sequencePosition="iconData.sequencePosition"
        :disabled="iconData.disabled"
        :showIconText="showIconText"
        @select="handleSelect(iconData.id)"
        @disabledSelect="handleDisabledSelect"
      />
    </div>

    <div class="action-row">
      <div
        class="progress-area"
        aria-hidden="true"
        :style="{ backgroundColor: $themePalette.grey.v_100 }"
      >
        <template v-for="(slot, i) in progressSlots">
          <KIcon
            v-if="slot.iconToken"
            :key="'icon-' + i"
            class="progress-icon"
            :icon="slot.iconToken"
          />
          <div
            v-else
            :key="'empty-' + i"
            class="progress-empty"
            :style="{ backgroundColor: $themeTokens.fineLine }"
          ></div>
        </template>
      </div>

      <!-- Submit button: shows only a forward-arrow icon; the aria-label
          cycles through four instructional states as the sequence is built. -->
      <button
        type="button"
        class="submit-button"
        :class="
          $computedClass({
            ':hover': submitEnabled
              ? {
                backgroundColor: $themeTokens.primaryDark,
              }
              : {},
          })
        "
        data-testid="submit-button"
        :aria-disabled="!submitEnabled ? 'true' : undefined"
        :aria-label="submitButtonAriaLabel"
        :style="submitButtonStyle"
        @click="handleSubmit"
      >
        <KIcon
          class="submit-icon"
          icon="forward"
          :color="submitEnabled ? $themeTokens.textInverted : $themePalette.grey.v_300"
        />
      </button>
    </div>
  </div>

</template>


<script>

  import { computed, ref, watch } from 'vue';
  import { PICTURE_PASSWORD_SET } from 'kolibri/constants';
  import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import useKResponsiveElement from 'kolibri-design-system/lib/composables/useKResponsiveElement';
  import PicturePasswordOption from './PicturePasswordOption';

  // Pre-compute once at module scope — PICTURE_PASSWORD_SET is static JSON so
  // there is no benefit to re-deriving this array on every component mount.
  const ICON_ENTRIES = Object.entries(PICTURE_PASSWORD_SET).map(([idStr, data]) => ({
    id: parseInt(idStr, 10),
    ...data,
  }));

  export default {
    name: 'PicturePasswordGrid',

    components: { PicturePasswordOption },

    setup(props, { emit }) {
      const $themeTokens = themeTokens();
      const $themePalette = themePalette();
      const { sendPoliteMessage } = useKLiveRegion();
      const { elementWidth } = useKResponsiveElement();

      const {
        iconSelectedAsFirst$,
        iconSelectedAsSecond$,
        iconSelectedAsThird$,
        allIconsSelected$,
        selectThreeIconsToSignIn$,
        selectTwoMoreIcons$,
        selectOneMoreIcon$,
        signInWithSequence$,
      } = picturePasswordStrings;

      // Internal selection state: up to 3 integer IDs in order of selection.
      const sequence = ref([]);

      const resolveIconToken = entry =>
        props.iconStyle === 'standard' ? entry.iconStandard : entry.iconColorful;

      const iconLabelFor = id => {
        const entry = PICTURE_PASSWORD_SET[String(id)];
        return picturePasswordStrings[`${entry.name}$`]();
      };

      // empiric value, options below this width look very squished
      // This value accounts for the grid gap as well.
      const minOptionWidth = 80;

      const allowedColumns = [3, 4, 6];

      // How many columns can we fit given the current width of the component?
      // Pick the largest allowed number of columns that will fit.
      const columns = computed(() => {
        const maxPossible = Math.floor(elementWidth.value / minOptionWidth);

        const validOptions = allowedColumns.filter(num => num <= maxPossible);

        return validOptions.length > 0 ? Math.max(...validOptions) : 3;
      });

      const icons = computed(() =>
        ICON_ENTRIES.map(entry => {
          const positionIndex = sequence.value.indexOf(entry.id);
          const inSequence = positionIndex >= 0;
          const sequenceFull = sequence.value.length === 3;
          return {
            id: entry.id,
            name: entry.name,
            iconToken: resolveIconToken(entry),
            sequencePosition: inSequence ? positionIndex + 1 : null,
            disabled: sequenceFull && !inSequence,
          };
        }),
      );

      const progressSlots = computed(() =>
        [0, 1, 2].map(i => {
          const id = sequence.value[i];
          if (id === undefined) {
            return { iconToken: null };
          }
          return { iconToken: resolveIconToken(PICTURE_PASSWORD_SET[String(id)]) };
        }),
      );

      const submitEnabled = computed(() => sequence.value.length === 3);

      // Maps number of icons selected to the appropriate aria-label string for the submit button
      const SUBMIT_ARIA_LABEL_MAP = {
        0: selectThreeIconsToSignIn$,
        1: selectTwoMoreIcons$,
        2: selectOneMoreIcon$,
      };

      const submitButtonAriaLabel = computed(() => {
        const len = sequence.value.length;
        if (len < 3) {
          return SUBMIT_ARIA_LABEL_MAP[len]();
        }

        return signInWithSequence$({
          icon1: iconLabelFor(sequence.value[0]),
          icon2: iconLabelFor(sequence.value[1]),
          icon3: iconLabelFor(sequence.value[2]),
        });
      });

      // Maps number of icon being selected to the appropriate aria-label for the live region
      // announcement when an icon is selected
      const ORDINAL_STRING_MAP = {
        1: iconSelectedAsFirst$,
        2: iconSelectedAsSecond$,
        3: iconSelectedAsThird$,
      };

      const handleSelect = id => {
        const existingIndex = sequence.value.indexOf(id);
        if (existingIndex >= 0) {
          // Deselect: drop this icon and everything after it.
          sequence.value = sequence.value.slice(0, existingIndex);
          return;
        }

        if (sequence.value.length >= 3) {
          // Shouldn't get here, but guard against adding more than 3 icons just in case
          return;
        }

        sequence.value = [...sequence.value, id];

        const position = sequence.value.length;
        sendPoliteMessage(ORDINAL_STRING_MAP[position]({ icon: iconLabelFor(id) }));
      };

      const handleDisabledSelect = () => {
        sendPoliteMessage(allIconsSelected$());
      };

      const handleSubmit = () => {
        if (!submitEnabled.value) return;
        emit('submit', sequence.value.join('.'));
      };

      watch(
        () => props.wrongSequence,
        value => {
          if (value) {
            sequence.value = [];
            emit('wrongSequenceHandled');
          }
        },
      );

      const submitButtonStyle = computed(() => ({
        backgroundColor: submitEnabled.value ? $themeTokens.primary : $themePalette.grey.v_200,
        cursor: submitEnabled.value ? 'pointer' : 'not-allowed',
      }));

      return {
        icons,
        columns,
        progressSlots,
        submitEnabled,
        submitButtonAriaLabel,
        submitButtonStyle,
        handleSelect,
        handleDisabledSelect,
        handleSubmit,
      };
    },

    props: {
      /**
       * Which icon variant to display: 'colorful' or 'standard'.
       */
      iconStyle: {
        type: String,
        default: PicturePasswordIconStyle.COLORFUL,
        validator: value => Object.values(PicturePasswordIconStyle).includes(value),
      },
      /**
       * Whether to show the translated icon name below each icon.
       */
      showIconText: {
        type: Boolean,
        default: true,
      },
      /**
       * Set to true by the parent when the submitted sequence was rejected by
       * the server. The grid clears its sequence and emits `wrongSequenceHandled`
       * so the parent can reset this prop back to false.
       */
      wrongSequence: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .picture-password-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .icon-grid {
    display: grid;
    gap: 22px;
  }

  /* Ensure each PicturePasswordOption fills its grid cell. */
  .icon-grid > * {
    width: 100%;
  }

  .action-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    align-items: stretch;
  }

  .progress-area {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-around;
    min-height: 56px;
    padding: 12px;
    // enforce width to be 50%, and set width and height for icons
    overflow: hidden;
    border-radius: 8px;
  }

  .progress-icon {
    width: 100%;
    max-width: 50px;
    height: 100%;
  }

  .progress-empty {
    width: 100%;
    max-width: 50px;
    height: 7px;
    border-radius: 16px;
  }

  .submit-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 8px;
    transition: $core-time;
  }

  .submit-icon {
    top: 0;
    width: 40px;
    height: 40px;
  }

</style>
