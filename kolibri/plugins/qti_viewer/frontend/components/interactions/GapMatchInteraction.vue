<script>

  import isEqual from 'lodash/isEqual';
  import { computed, h, inject, provide, watch } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import AnswerGuide, { answerGuideStrings } from '../AnswerGuide.vue';
  import {
    choiceText,
    findVNodes,
    getComponentTag,
    isFixed,
    orderChoices,
  } from '../../utils/choices';
  import { BooleanProp, NonNegativeIntProp, QTIIdentifierProp } from '../../utils/props';
  import useTypedProps from '../../composables/useTypedProps';
  import useMatchRows, { PAIR_ORDER } from '../../composables/useMatchRows';

  const PROMPT_TAG = 'qti-prompt';
  const GAP_TAG = 'qti-gap';
  const CHOICE_TAGS = ['qti-gap-text', 'qti-gap-img'];

  export const gapMatchStrings = createTranslator('GapMatchInteractionStrings', {
    responsePoolLabel: {
      message: 'Response pool',
      context:
        'Label for the set of answers a learner drags or picks from when filling the blanks in a gap match question',
    },
    gapEmpty: {
      message: 'Gap {number, number} of {total, number}: empty',
      context:
        'Accessible label for a blank a learner has not filled yet. {number} is its position in the passage, so a screen-reader user can tell the gaps apart.',
    },
    gapFilled: {
      message: 'Gap {number, number} of {total, number}: {response}',
      context:
        'Accessible label for a blank a learner has filled. {number} is its position in the passage, and {response} the answer placed there.',
    },
  });

  const { responsePoolLabel$, gapEmpty$, gapFilled$ } = gapMatchStrings;

  const $themeTokens = themeTokens();
  const $themePalette = themePalette();

  export default {
    name: 'QtiGapMatchInteraction',
    tag: 'qti-gap-match-interaction',

    setup(props, { slots, attrs }) {
      const QTI_CONTEXT = inject('QTI_CONTEXT');
      const responses = inject('responses');
      const interactive = inject('interactive');
      const typedProps = useTypedProps(props);

      // The passage and the choices are static: parse the slot vnodes once
      // rather than on every render.
      const allContent = (slots.default && slots.default()) || [];
      const isChoice = vnode => CHOICE_TAGS.includes(getComponentTag(vnode));
      const promptContent = allContent.filter(vnode => getComponentTag(vnode) === PROMPT_TAG);
      const choiceVNodes = allContent.filter(isChoice);
      const passageContent = allContent.filter(
        vnode => getComponentTag(vnode) !== PROMPT_TAG && !isChoice(vnode),
      );

      // A gap sits wherever the author put it in the passage, so the gaps are
      // found by walking it. Document order is the order a learner reads them
      // in, which is what their numbering has to follow.
      const gapIds = findVNodes(passageContent, [GAP_TAG]).map(
        vnode => vnode.componentOptions.propsData.identifier,
      );

      const choices = choiceVNodes.map(vnode => ({
        identifier: vnode.componentOptions.propsData.identifier,
        fixed: isFixed(vnode),
      }));

      const contentByIdentifier = {};
      const textByIdentifier = {};
      const matchMaxByIdentifier = {};
      choiceVNodes.forEach(vnode => {
        const { identifier, matchMax } = vnode.componentOptions.propsData;
        contentByIdentifier[identifier] = vnode.componentOptions.children || [];
        textByIdentifier[identifier] = choiceText(vnode);
        matchMaxByIdentifier[identifier] = matchMax === undefined ? 1 : Number(matchMax);
      });
      // A gap holds exactly one choice, which is the row capacity the rows
      // composable reads off its sources.
      gapIds.forEach(identifier => {
        matchMaxByIdentifier[identifier] = 1;
      });

      const matchMaxOf = identifier => matchMaxByIdentifier[identifier] ?? 1;
      const labelFor = identifier => textByIdentifier[identifier] || identifier;

      const choiceIds = computed(() =>
        orderChoices(choices, {
          shuffle: typedProps.shuffle.value,
          seed: QTI_CONTEXT.value.candidateIdentifier,
        }).map(choice => choice.identifier),
      );

      // Every gap is a row that holds one choice; the pool is the whole choice
      // set. A gap match pair names the choice first, which is the one thing
      // that differs from a match interaction's rows.
      const { pool, pairs, currentValue, isPlaceable, hydrate } = useMatchRows({
        sourceIds: gapIds,
        targetIds: choiceIds,
        matchMaxOf,
        maxAssociations: computed(() => typedProps.maxAssociations.value),
        pairOrder: PAIR_ORDER.POOL_FIRST,
      });

      const variable = computed(() => responses.value[typedProps.responseIdentifier.value]);

      // The variable is derived from the gaps, so ignore the change our own
      // write causes and only rebuild from a value that came from elsewhere.
      watch(
        () => variable.value?.value,
        value => {
          if (isEqual(value, pairs.value)) {
            return;
          }
          hydrate(value);
        },
        { immediate: true },
      );

      watch(pairs, value => {
        if (!interactive.value || !variable.value) {
          return;
        }
        variable.value.value = value.map(pair => [...pair]);
      });

      const poolStyles = computed(() => ({
        backgroundColor: $themePalette.grey.v_100,
        borderColor: $themeTokens.fineLine,
      }));
      const poolLabelStyles = computed(() => ({ color: $themeTokens.annotation }));
      const passageStyles = computed(() => ({
        borderColor: $themeTokens.fineLine,
        color: $themeTokens.text,
      }));

      function chipStyles({ exhausted }) {
        if (exhausted) {
          return {
            backgroundColor: $themeTokens.surface,
            borderColor: $themeTokens.fineLine,
            color: $themeTokens.annotation,
          };
        }
        return {
          backgroundColor: $themeTokens.surface,
          borderColor: $themeTokens.fineLine,
          color: $themeTokens.text,
        };
      }

      function renderChip(identifier, { exhausted = false } = {}) {
        return h(
          'span',
          {
            class: ['qti-gap-match-chip', { 'qti-gap-match-chip-exhausted': exhausted }],
            style: chipStyles({ exhausted }),
            attrs: exhausted ? { 'aria-disabled': 'true' } : {},
          },
          [...contentByIdentifier[identifier]],
        );
      }

      function gapLabel(gapIndex) {
        const number = gapIndex + 1;
        const total = gapIds.length;
        const identifier = currentValue(gapIndex, 0);
        return identifier
          ? gapFilled$({ number, total, response: labelFor(identifier) })
          : gapEmpty$({ number, total });
      }

      // What a gap needs from the interaction. A gap's limits are stated across
      // the whole interaction rather than on the gap itself, so the state stays
      // here and the gap reads from it.
      provide('qtiGapMatch', {
        indexOf: identifier => gapIds.indexOf(identifier),
        currentValue: gapIndex => currentValue(gapIndex, 0),
        gapLabel,
        renderChip,
      });

      function renderPool() {
        return h('div', { class: 'qti-gap-match-pool', style: poolStyles.value }, [
          h(
            'p',
            {
              class: 'qti-gap-match-pool-label',
              style: poolLabelStyles.value,
              attrs: { 'aria-hidden': 'true' },
            },
            responsePoolLabel$(),
          ),
          h(
            'ul',
            {
              class: 'qti-gap-match-pool-items',
              attrs: { 'aria-label': responsePoolLabel$() },
            },
            pool.value.map(identifier =>
              h('li', { key: identifier, class: 'qti-gap-match-pool-entry' }, [
                renderChip(identifier, { exhausted: !isPlaceable(identifier) }),
              ]),
            ),
          ),
        ]);
      }

      return () => {
        if (!choices.length || !gapIds.length) {
          return;
        }

        return h('div', [
          ...promptContent,
          h(AnswerGuide, { props: { text: answerGuideStrings.gapMatch$() } }),
          h(
            'div',
            {
              class: [
                attrs.class || '',
                'qti-gap-match-interaction',
                { 'qti-gap-match-readonly': !interactive.value },
              ],
            },
            [
              renderPool(),
              h(
                'div',
                { class: 'qti-gap-match-passage', style: passageStyles.value },
                passageContent,
              ),
            ],
          ),
        ]);
      };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      responseIdentifier: QTIIdentifierProp(true),
      shuffle: BooleanProp(false, false),
      // QTI's default for gap match is 1, unlike match, where it is unlimited
      maxAssociations: NonNegativeIntProp(false, 1),
      minAssociations: NonNegativeIntProp(false, 0),
      /* eslint-enable */
    },
  };

</script>


<!-- Not scoped: the chips wrap authored QTI content, whose vnodes are created by
     the item body's SafeHTML render and so carry a different scope id. -->
<style lang="scss">

  $chip-max-size: 150px;
  $chip-padding-block: 8px;
  $chip-padding-inline: 12px;
  $chip-border-width: 1px;
  $chip-content-max-size: $chip-max-size - 2 * ($chip-padding-inline + $chip-border-width);

  .qti-gap-match-pool {
    padding: 0.75rem;
    margin-bottom: 1rem;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

  .qti-gap-match-pool-label {
    margin: 0 0 0.5rem;
    font-size: 12px;
  }

  .qti-gap-match-pool-items {
    display: flex;
    // Not the default `stretch`: an entry taller than the chip it holds shows up
    // as empty space the moment a drag puts a shadow on it.
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .qti-gap-match-chip {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: $chip-max-size;
    padding-block: $chip-padding-block;
    padding-inline: $chip-padding-inline;
    overflow: hidden;
    cursor: pointer;
    user-select: none;
    border-style: solid;
    border-width: $chip-border-width;
    border-radius: 8px;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;

    // Authored content is scaled down to the response size rather than the chip
    // growing to the content. SafeHTML styles images for page-level display,
    // which is furniture a chip has no room for.
    .image-container,
    .img-wrapper,
    .img-button {
      width: $chip-content-max-size;
      min-width: 0;
      max-width: none;
      height: $chip-content-max-size;
      margin: 0;
    }

    .img-wrapper {
      box-shadow: none;
    }

    .img-button {
      pointer-events: none;
    }

    .expand-btn {
      display: none;
    }

    img {
      width: 100%;
      max-width: none;
      height: 100%;
      max-height: none;
      object-fit: scale-down;
    }
  }

  // Every use spent, so it can no longer fill a gap
  .qti-gap-match-chip-exhausted {
    cursor: default;
    opacity: 0.55;
  }

  // Review mode has nothing to click
  .qti-gap-match-readonly {
    .qti-gap-match-chip {
      cursor: default;
    }
  }

  .qti-gap-match-passage {
    padding: 1rem 1.125rem;
    line-height: 2.25;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

</style>
