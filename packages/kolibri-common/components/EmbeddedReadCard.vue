<template>

  <!-- role, tabindex, aria-label and keyboard handlers are set together with
       the click handler when active; the rule can't see through the ternary role -->
  <!-- eslint-disable vuejs-accessibility/no-static-element-interactions -->
  <div
    :class="active ? 'embedded-read-card' : 'embedded-read-card-passthrough'"
    :role="active ? 'button' : null"
    :tabindex="active ? 0 : null"
    :aria-label="active ? readLabel : null"
    :style="active ? cardStyle : null"
    @click="emitRead"
    @keydown.enter="emitRead"
    @keydown.space="onSpace"
  >
    <div
      :class="active ? 'embedded-read-card-content' : 'embedded-read-card-content-passthrough'"
      :inert="active"
    >
      <slot></slot>
    </div>
    <span
      v-if="active"
      class="embedded-read-card-pill"
      :style="pillStyle"
    >
      {{ readLabel }}
    </span>
  </div>
  <!-- eslint-enable vuejs-accessibility/no-static-element-interactions -->

</template>


<script>

  import { computed } from 'vue';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';

  /**
   * Wraps a content viewer so it renders as a clickable preview card on a
   * mobile-embedded viewport. When `active` is true, the card displays a
   * grey-bordered frame around the wrapped viewer with a "READ" pill at the
   * bottom; tapping anywhere on the card emits `read` (used by the viewer to
   * toggle fullscreen). When `active` is false, the wrapper is transparent
   * (a bare block) and the wrapped content renders unchanged.
   *
   * The DOM structure stays stable between states so the slot content is
   * never remounted on toggle.
   *
   * Content inside the card is clipped to the card's bounds and marked
   * `inert`, so the entire card is a single target for pointer, keyboard and
   * assistive technology alike.
   */
  export default {
    name: 'EmbeddedReadCard',
    setup(props, { emit }) {
      const readLabel = computed(() => coreString('read'));
      const cardStyle = computed(() => ({
        backgroundColor: themePalette().grey.v_100,
        border: `1px solid ${themeTokens().fineLine}`,
        borderRadius: '4px',
      }));
      const pillStyle = computed(() => ({
        backgroundColor: themeTokens().primary,
        color: themeTokens().textInverted,
      }));

      function emitRead() {
        if (props.active) emit('read');
      }

      function onSpace(event) {
        if (!props.active) return;
        event.preventDefault();
        emit('read');
      }

      return { readLabel, cardStyle, pillStyle, emitRead, onSpace };
    },
    props: {
      active: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .embedded-read-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    cursor: pointer;
  }

  // The root carries the consumer's class (e.g. `.content-viewer`), so it must
  // stay a real box for that sizing to apply. Flex column, not block, so a taller
  // viewer shrinks to a `max-height`-only consumer instead of overflowing it.
  .embedded-read-card-passthrough {
    display: flex;
    flex-direction: column;
  }

  .embedded-read-card-content-passthrough {
    display: contents;
  }

  .embedded-read-card-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    // Pointer fallback for browsers without `inert`, which does this itself.
    pointer-events: none;
  }

  .embedded-read-card-pill {
    align-self: center;
    padding: 8px 16px;
    font-size: 0.875rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 2px;
  }

</style>
