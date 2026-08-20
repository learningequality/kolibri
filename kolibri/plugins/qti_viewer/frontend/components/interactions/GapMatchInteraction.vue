<script>

  import isEqual from 'lodash/isEqual';
  import { computed, h, inject, provide, ref, watch } from 'vue';
  import { themeBrand, themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import DraggableRegion from 'kolibri-common/components/draggable/DraggableRegion';
  import DraggableItem from 'kolibri-common/components/draggable/DraggableItem';
  import DraggableHandle from 'kolibri-common/components/draggable/DraggableHandle';
  import useDraggableUniverse from 'kolibri-common/components/draggable/useDraggableUniverse';
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
  import useSlotListbox from '../../composables/useSlotListbox';

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
  const $themeBrand = themeBrand();

  // Exposed as a custom property so the :focus rule below can use a theme colour
  const interactionCSSVars = { '--qti-gap-match-color-primary': $themeTokens.primary };

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
      const gapVNodes = findVNodes(passageContent, [GAP_TAG]);
      const gapIds = gapVNodes.map(vnode => vnode.componentOptions.propsData.identifier);

      const choices = choiceVNodes.map(vnode => ({
        identifier: vnode.componentOptions.propsData.identifier,
        fixed: isFixed(vnode),
      }));

      const contentByIdentifier = {};
      const textByIdentifier = {};
      const matchMaxByIdentifier = {};
      // `match-group` is a list of the identifiers the element may be paired
      // with, so an authored one is read as a set rather than as a name.
      const matchGroupByIdentifier = {};
      function readMatchGroup(vnode) {
        const { identifier, matchGroup } = vnode.componentOptions.propsData;
        matchGroupByIdentifier[identifier] = new Set(
          String(matchGroup || '')
            .split(/\s+/)
            .filter(Boolean),
        );
      }
      choiceVNodes.forEach(vnode => {
        const { identifier, matchMax } = vnode.componentOptions.propsData;
        contentByIdentifier[identifier] = vnode.componentOptions.children || [];
        textByIdentifier[identifier] = choiceText(vnode);
        matchMaxByIdentifier[identifier] = matchMax === undefined ? 1 : Number(matchMax);
        readMatchGroup(vnode);
      });
      gapVNodes.forEach(readMatchGroup);

      function isCompatible(gapId, choiceId) {
        const gapGroup = matchGroupByIdentifier[gapId];
        const choiceGroup = matchGroupByIdentifier[choiceId];
        if (choiceGroup?.size && !choiceGroup.has(gapId)) {
          return false;
        }
        if (gapGroup?.size && !gapGroup.has(choiceId)) {
          return false;
        }
        return true;
      }
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
      const {
        pool,
        pairs,
        currentValue,
        isPlaceable,
        place,
        clear,
        remove,
        candidatesFor,
        hydrate,
      } = useMatchRows({
        sourceIds: gapIds,
        targetIds: choiceIds,
        matchMaxOf,
        maxAssociations: computed(() => typedProps.maxAssociations.value),
        pairOrder: PAIR_ORDER.POOL_FIRST,
      });

      const { isDragging, draggedItem } = useDraggableUniverse();

      let dragOriginGap = null;

      const variable = computed(() => responses.value[typedProps.responseIdentifier.value]);

      // Only one of these is ever set: the learner either picks a response and
      // then a gap, or picks a gap and then a response.
      const selectedIdentifier = ref(null);
      const activeGap = ref(null);

      function clearSelection() {
        selectedIdentifier.value = null;
        activeGap.value = null;
      }

      function candidatesForGap(gapIndex) {
        return candidatesFor(gapIndex, 0).filter(identifier =>
          isCompatible(gapIds[gapIndex], identifier),
        );
      }

      function placeInGap(identifier, gapIndex) {
        if (!isCompatible(gapIds[gapIndex], identifier)) {
          return;
        }
        place(identifier, gapIndex, 0);
      }

      function selectResponse(identifier) {
        if (!interactive.value || !isPlaceable(identifier)) {
          return;
        }
        if (activeGap.value !== null) {
          placeInGap(identifier, activeGap.value);
          clearSelection();
          return;
        }
        selectedIdentifier.value = selectedIdentifier.value === identifier ? null : identifier;
      }

      function selectGap(gapIndex) {
        listbox.forgetPointer();
        if (!interactive.value) {
          return;
        }
        if (selectedIdentifier.value) {
          // A refusal, by the item's limits or by match-group, just leaves the
          // gap as it was
          placeInGap(selectedIdentifier.value, gapIndex);
          clearSelection();
          return;
        }
        if (activeGap.value === gapIndex) {
          clearSelection();
          return;
        }
        // A choice can be reusable, so there is nothing to pick up and carry
        // from a filled gap: clicking it takes the response back out instead.
        if (currentValue(gapIndex, 0)) {
          clear(gapIndex, 0);
          clearSelection();
          return;
        }
        activeGap.value = gapIndex;
      }

      // Whether the pool should offer this choice for the gap awaiting one
      function isCandidateForActiveGap(identifier) {
        if (activeGap.value === null) {
          return false;
        }
        return candidatesForGap(activeGap.value).includes(identifier);
      }

      // Keyboard navigation is for the gaps, not the pool. A gap is one slot
      // holding one response, so it is addressed by its position alone and the
      // row's single entry is filled in here.
      const listbox = useSlotListbox({
        candidatesFor: candidatesForGap,
        currentValue: gapIndex => currentValue(gapIndex, 0),
        commit: placeInGap,
        clear: gapIndex => clear(gapIndex, 0),
        labelFor,
        disabled: computed(() => !interactive.value),
        onKeyboardFocus: clearSelection,
      });

      // A drop is reported as a new item list rather than as a placement, so
      // work out what changed rather than trusting the list.
      function reconcileGap(gapIndex, newItems) {
        if (!interactive.value) {
          return;
        }
        const identifiers = newItems.map(item => item.identifier).filter(Boolean);
        const current = currentValue(gapIndex, 0);

        const arrived = identifiers.find(identifier => identifier !== current);
        if (arrived) {
          if (dragOriginGap !== null && dragOriginGap !== gapIndex) {
            remove(arrived, dragOriginGap);
          }
          placeInGap(arrived, gapIndex);
          return;
        }

        if (!identifiers.length && current) {
          remove(current, gapIndex);
        }
      }

      function admissible(value) {
        if (!Array.isArray(value)) {
          return value;
        }
        return value.filter(
          pair => Array.isArray(pair) && pair.length === 2 && isCompatible(pair[1], pair[0]),
        );
      }

      // The variable is derived from the gaps, so ignore the change our own
      // write causes and only rebuild from a value that came from elsewhere.
      watch(
        () => variable.value?.value,
        value => {
          if (isEqual(value, pairs.value)) {
            return;
          }
          hydrate(admissible(value));
        },
        { immediate: true },
      );

      watch(pairs, value => {
        if (!interactive.value || !variable.value) {
          return;
        }
        variable.value.value = value.map(pair => [...pair]);
      });

      watch(interactive, clearSelection);

      const poolStyles = computed(() => ({
        backgroundColor: $themePalette.grey.v_100,
        borderColor: $themeTokens.fineLine,
      }));
      const poolLabelStyles = computed(() => ({ color: $themeTokens.annotation }));
      const passageStyles = computed(() => ({
        borderColor: $themeTokens.fineLine,
        color: $themeTokens.text,
      }));

      function chipStyles({ exhausted, selected, candidate }) {
        if (exhausted) {
          return {
            backgroundColor: $themeTokens.surface,
            borderColor: $themeTokens.fineLine,
            color: $themeTokens.annotation,
          };
        }
        if (selected) {
          return {
            backgroundColor: $themeBrand.primary.v_50,
            borderColor: $themeTokens.primary,
            color: $themeTokens.primary,
          };
        }
        if (candidate) {
          return {
            backgroundColor: $themeTokens.surface,
            borderColor: $themeTokens.primary,
            color: $themeTokens.primary,
          };
        }
        return {
          backgroundColor: $themeTokens.surface,
          borderColor: $themeTokens.fineLine,
          color: $themeTokens.text,
        };
      }

      // The whole chip is the drag handle, so DraggableHandle marks the chip
      // itself rather than wrapping it in another element.
      function renderChip(
        identifier,
        {
          exhausted = false,
          selected = false,
          candidate = false,
          ariaHidden = false,
          draggable = false,
          on,
        } = {},
      ) {
        const chip = h(
          'span',
          {
            class: [
              'qti-gap-match-chip',
              {
                'qti-gap-match-chip-exhausted': exhausted,
                'qti-gap-match-chip-selected': selected,
                'qti-gap-match-chip-candidate': candidate && !selected,
              },
            ],
            style: chipStyles({ exhausted, selected, candidate }),
            attrs: {
              ...(exhausted ? { 'aria-disabled': 'true' } : {}),
              ...(ariaHidden ? { 'aria-hidden': 'true' } : {}),
            },
            on,
          },
          [...contentByIdentifier[identifier]],
        );
        return draggable && interactive.value ? h(DraggableHandle, [chip]) : chip;
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
        // The chip a gap shows repeats a response the pool already names, so it
        // is hidden from a screen reader in favour of the gap's own label.
        renderChip: identifier => renderChip(identifier, { ariaHidden: true, draggable: true }),
        isActive: gapIndex => activeGap.value === gapIndex,
        accepts: (gapIndex, item) => isCompatible(gapIds[gapIndex], item?.identifier),
        isRefusingDrag: gapIndex =>
          isDragging.value &&
          Boolean(draggedItem.value) &&
          !isCompatible(gapIds[gapIndex], draggedItem.value.identifier),
        listbox,
        selectGap,
        reconcileGap,
        noteDragOrigin: gapIndex => {
          dragOriginGap = gapIndex;
        },
        interactive,
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
            DraggableRegion,
            {
              props: {
                // Exhausted chips stay visible but are not draggable, so they
                // are left out of the region's items to keep its indexes
                // aligned with the rendered children
                items: pool.value
                  .filter(identifier => isPlaceable(identifier))
                  .map(identifier => ({ identifier })),
                sortable: false,
                disabled: !interactive.value,
                label: responsePoolLabel$(),
              },
              on: {
                dragstart: () => {
                  dragOriginGap = null;
                },
              },
            },
            [
              h(
                'ul',
                {
                  class: 'qti-gap-match-pool-items',
                  attrs: { 'aria-label': responsePoolLabel$() },
                },
                pool.value.map(identifier => {
                  const exhausted = !isPlaceable(identifier);
                  const chip = renderChip(identifier, {
                    exhausted,
                    draggable: !exhausted,
                    selected: selectedIdentifier.value === identifier,
                    candidate: isCandidateForActiveGap(identifier),
                    on: { click: () => selectResponse(identifier) },
                  });
                  if (exhausted) {
                    return h('li', { key: identifier, class: 'qti-gap-match-pool-entry' }, [chip]);
                  }
                  return h(
                    DraggableItem,
                    { key: identifier, props: { disabled: !interactive.value } },
                    [h('li', { class: 'qti-gap-match-pool-entry' }, [chip])],
                  );
                }),
              ),
            ],
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
              style: interactionCSSVars,
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

  .qti-gap-match-chip-selected {
    font-weight: 600;
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
