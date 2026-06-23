<template>

  <!--
    Custom on-screen numeric keypad.

    Perseus ships its own math-input keypad, but it hard-codes ASCII digits and
    its own layout/styling, so it can't render the content's native numeral
    system and never sat well inside Kolibri. We render our own keypad instead
    (wired to Perseus via the KeypadContext bridge in useKeypad) so we control
    both the i18n of the digits and the presentation.
  -->
  <div
    ref="anchor"
    class="keypad-anchor"
    :style="anchorStyle"
  >
    <transition name="keypad-slide">
      <div
        v-show="active"
        ref="container"
        class="numeric-keypad"
      >
        <div
          class="keypad-body"
          :style="keypadBodyStyle"
        >
          <div
            class="keypad-grid"
            :class="{ 'expression-grid': isExpression }"
          >
            <!--
              Numbers first in DOM for tab order, then operators. Each key
              carries its own grid placement in key.gridStyle (see keys.js).

              @mousedown.native.prevent stops the button from stealing focus
              from the math input on press. Without it the input blurs, which
              dismisses the keypad and drops the cursor, so the key press would
              never land in the field.
            -->
            <KButton
              v-for="key in primaryKeys"
              :key="key.id"
              :text="key.label"
              :aria-label="key.ariaLabel()"
              class="key-btn"
              :style="key.gridStyle"
              :primary="false"
              appearance="flat-button"
              :appearanceOverrides="keyStyles"
              @click="onPress(key.id)"
              @mousedown.native.prevent
            />
            <KButton
              v-for="key in secondaryKeys"
              :key="key.id"
              :text="key.label"
              :aria-label="key.ariaLabel()"
              class="key-btn secondary"
              :style="key.gridStyle"
              :primary="false"
              appearance="flat-button"
              :appearanceOverrides="keyStyles"
              @click="onPress(key.id)"
              @mousedown.native.prevent
            />
          </div>
          <div class="nav-pad">
            <KIconButton
              icon="chevronUp"
              :ariaLabel="upArrow$()"
              appearance="raised-button"
              size="small"
              class="nav-btn nav-up"
              @click="onPress('UP')"
              @mousedown.native.prevent
            />
            <KIconButton
              icon="chevronLeft"
              :ariaLabel="leftArrow$()"
              appearance="raised-button"
              size="small"
              class="nav-btn nav-left"
              @click="onPress('LEFT')"
              @mousedown.native.prevent
            />
            <div class="nav-spacer"></div>
            <KIconButton
              icon="chevronRight"
              :ariaLabel="rightArrow$()"
              appearance="raised-button"
              size="small"
              class="nav-btn nav-right"
              @click="onPress('RIGHT')"
              @mousedown.native.prevent
            />
            <KIconButton
              icon="chevronDown"
              :ariaLabel="downArrow$()"
              appearance="raised-button"
              size="small"
              class="nav-btn nav-down"
              @click="onPress('DOWN')"
              @mousedown.native.prevent
            />
          </div>
          <!--
            size="small" (32x32) rather than "mini": KIconButton forces
            minWidth: 32px, so a 24px "mini" button renders as an oval. "small"
            keeps width and height equal for a true circle.
          -->
          <KIconButton
            icon="close"
            :ariaLabel="closeLabel()"
            appearance="flat-button"
            size="small"
            class="close-btn"
            @click="dismiss"
            @mousedown.native.prevent
          />
        </div>
      </div>
    </transition>
  </div>

</template>


<script>

  import { computed, nextTick, ref, watch } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { injectKeypad } from '../../composables/useKeypad';
  import useScrollContainer from '../../composables/useScrollContainer';
  import translator from '../../translator';
  import { getLocalizedDigits } from '../../numeralNormalization';
  import { fractionLayout, expressionLayout } from './keys';

  export default {
    name: 'NumericKeypad',
    setup(props) {
      const keypad = injectKeypad();
      const container = ref(null);
      const anchor = ref(null);

      // Keep the API's getDOMNode in sync with the container ref
      watch(container, el => {
        keypad.setDOMNode(el);
      });

      // --- Vertical positioning ---
      //
      // The keypad is a full-width bar pinned to the bottom of the content's
      // scrolling region, just above each host's bottom chrome. Rather than
      // reason about each host's layout, we detect the nearest scrollable
      // ancestor and follow its visible viewport rect (clamped to the window).
      // A fixed-position bar at `window.innerHeight - rect.bottom` then sits at
      // that region's visible bottom regardless of how tall the content grows.
      const { containerRect, updateRect } = useScrollContainer(anchor);

      const anchorStyle = computed(() => {
        const rect = containerRect.value;
        return {
          bottom: `${window.innerHeight - rect.bottom}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
        };
      });

      // The scroll container's viewport rect is computed on mount and on
      // resize; recompute when the keypad opens in case the surrounding layout
      // settled after mount (e.g. content finished loading).
      watch(keypad.active, isActive => {
        if (isActive) {
          nextTick(updateRect);
        }
      });

      const localizedDigits = computed(() => getLocalizedDigits(props.lang && props.lang.id));

      const isExpression = computed(() => keypad.keypadConfig.value?.keypadType === 'EXPRESSION');

      const useTimes = computed(() => keypad.keypadConfig.value?.times);

      const fineLine = themeTokens().fineLine;

      // Style overrides for KButton to match keypad sizing
      const keyBtnBaseStyles = {
        minHeight: '48px',
        minWidth: '0',
        fontSize: '18px',
        fontWeight: '700',
        textTransform: 'none',
        padding: '0',
        borderRadius: '4px',
      };

      const keyStyles = {
        ...keyBtnBaseStyles,
        border: `1px solid ${fineLine}`,
        backgroundColor: themePalette().grey.v_100,
      };

      const { upArrow$, downArrow$, leftArrow$, rightArrow$ } = translator;

      const { closeAction$ } = coreStrings;

      // Drop shadow is applied via the %dropshadow-2dp placeholder in the
      // style block; only the themed colours need to be computed here.
      const keypadBodyStyle = {
        background: themeTokens().surface,
        border: `1px solid ${fineLine}`,
        borderBottom: 'none',
      };

      const visibleKeys = computed(() =>
        isExpression.value
          ? expressionLayout(localizedDigits.value, useTimes.value)
          : fractionLayout(localizedDigits.value),
      );

      const primaryKeys = computed(() => visibleKeys.value.filter(k => !k.secondary));

      const secondaryKeys = computed(() => visibleKeys.value.filter(k => k.secondary));

      function onPress(keyId) {
        if (keyId === 'DISMISS') {
          keypad.dismiss();
          return;
        }
        keypad.handleKeyPress(keyId);
      }

      return {
        container,
        anchor,
        anchorStyle,
        active: keypad.active,
        dismiss: keypad.dismiss,
        isExpression,
        primaryKeys,
        secondaryKeys,
        onPress,
        keyStyles,
        upArrow$,
        downArrow$,
        leftArrow$,
        rightArrow$,
        closeLabel: closeAction$,
        keypadBodyStyle,
      };
    },
    props: {
      lang: {
        type: Object,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  // Pinned to the scroll container's visible bottom via inline left/width/bottom
  // (see anchorStyle). Fixed positioning keeps it locked to that viewport region
  // independent of how the content scrolls or grows.
  .keypad-anchor {
    position: fixed;
    z-index: 20;
    overflow: hidden;
    pointer-events: none;
  }

  .numeric-keypad {
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .keypad-body {
    @extend %dropshadow-2dp;

    position: relative;
    display: flex;
    gap: 16px;
    width: 100%;
    max-width: 540px;
    padding: 6px;
    pointer-events: auto;
    direction: ltr;
  }

  .close-btn {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .keypad-grid {
    display: grid;
    flex: 1;
    grid-template-rows: repeat(4, 1fr);
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }

  .keypad-grid.expression-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  /* Navigation pad: 3×3 cross layout */
  .nav-pad {
    display: grid;
    flex-shrink: 0;
    grid-template-rows: repeat(3, 44px);
    grid-template-columns: repeat(3, 44px);
    gap: 0;
    align-self: center;
  }

  .nav-spacer {
    grid-row: 2;
    grid-column: 2;
  }

  .nav-up {
    grid-row: 1;
    grid-column: 2;
  }

  .nav-left {
    grid-row: 2;
    grid-column: 1;
  }

  .nav-right {
    grid-row: 2;
    grid-column: 3;
  }

  .nav-down {
    grid-row: 3;
    grid-column: 2;
  }

  /* Slide transition */
  .keypad-slide-enter-active,
  .keypad-slide-leave-active {
    transition: transform 0.2s ease-out;
  }

  .keypad-slide-enter,
  .keypad-slide-leave-to {
    transform: translate3d(0, 100%, 0);
  }

</style>
