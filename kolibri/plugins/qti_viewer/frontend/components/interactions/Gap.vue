<script>

  import { computed, h, inject } from 'vue';
  import { themeBrand, themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { QTIIdentifierProp, StringProp } from '../../utils/props';

  const $themeTokens = themeTokens();
  const $themePalette = themePalette();
  const $themeBrand = themeBrand();

  export default {
    name: 'Gap',
    tag: 'qti-gap',

    // SafeHTML hands an authored attribute over in `attrs`, and Vue applies a
    // component placeholder's attrs after the component itself has rendered —
    // so an authored `class` would replace this one's own root class rather
    // than joining it. Take the attrs over and merge the class in by hand.
    inheritAttrs: false,

    setup(props, { attrs }) {
      // The interaction owns every gap's state, because a gap's limits are
      // stated across the whole interaction rather than on the gap itself.
      // A gap authored outside one has nothing to fill it, so it renders nothing.
      const gapMatch = inject('qtiGapMatch', null);

      const index = computed(() => gapMatch?.indexOf(props.identifier) ?? -1);
      const identifier = computed(() =>
        index.value === -1 ? null : gapMatch.currentValue(index.value),
      );
      const filled = computed(() => Boolean(identifier.value));
      const active = computed(() => index.value !== -1 && gapMatch.isActive(index.value));

      const styles = computed(() => {
        if (active.value) {
          return {
            backgroundColor: $themeBrand.primary.v_50,
            borderColor: $themeTokens.primary,
          };
        }
        return {
          backgroundColor: filled.value ? $themePalette.grey.v_100 : 'transparent',
          borderColor: $themeTokens.fineLine,
        };
      });

      return () => {
        if (!gapMatch || index.value === -1) {
          return null;
        }
        return h(
          'span',
          {
            class: [
              'qti-gap',
              attrs.class || '',
              {
                'qti-gap-filled': filled.value,
                'qti-gap-active': active.value,
                'qti-gap-readonly': !gapMatch.interactive.value,
              },
            ],
            style: styles.value,
            attrs: { 'aria-label': gapMatch.gapLabel(index.value) },
            on: { click: () => gapMatch.selectGap(index.value) },
          },
          filled.value ? [gapMatch.renderChip(identifier.value)] : [],
        );
      };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      identifier: QTIIdentifierProp(true),
      // A space-separated list of the identifiers this gap may be filled from.
      // Empty means any choice may go in it.
      matchGroup: StringProp(false),
      /* eslint-enable */
    },
  };

</script>


<!-- Not scoped: the chip a gap holds wraps authored QTI content, whose vnodes
     are created by the item body's SafeHTML render and so carry a different
     scope id. -->
<style lang="scss">

  .qti-gap {
    // Flow inline within the sentence, without stretching the line box.
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 6ch;
    min-height: 2.25em;
    padding: 2px 6px;
    vertical-align: middle;
    cursor: pointer;
    border-style: dashed;
    border-width: 1px;
    border-radius: 6px;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;
  }

  .qti-gap-filled {
    border-style: solid;
  }

  .qti-gap-readonly {
    cursor: default;
  }

</style>
