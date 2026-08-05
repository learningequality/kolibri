<script>

  import isEqual from 'lodash/isEqual';
  import { computed, h, inject, ref, watch } from 'vue';
  import { themeBrand, themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import DraggableRegion from 'kolibri-common/components/draggable/DraggableRegion';
  import DraggableItem from 'kolibri-common/components/draggable/DraggableItem';
  import DraggableHandle from 'kolibri-common/components/draggable/DraggableHandle';
  import useDraggableUniverse from 'kolibri-common/components/draggable/useDraggableUniverse';
  import AnswerGuide, { answerGuideStrings } from '../AnswerGuide.vue';
  import { choiceText, getComponentTag, isFixed, orderChoices } from '../../utils/choices';
  import { BooleanProp, NonNegativeIntProp, QTIIdentifierProp } from '../../utils/props';
  import useTypedProps from '../../composables/useTypedProps';
  import useMatchRows from '../../composables/useMatchRows';

  const SET_TAG = 'qti-simple-match-set';
  const CHOICE_TAG = 'qti-simple-associable-choice';

  export const matchStrings = createTranslator('MatchInteractionStrings', {
    responsePoolLabel: {
      message: 'Response pool',
      context:
        'Label for the set of answers a learner drags or picks from when matching in a match question',
    },
    emptyEntryPlaceholder: {
      message: 'Answer',
      context: 'Placeholder shown in an empty answer slot of a match question',
    },
    entryEmpty: {
      message: 'Add a response for {source}',
      context:
        'Accessible label for the empty answer slot on one row of a match question. {source} is the item being matched, e.g. a scientist being matched to a field.',
    },
    entryFilled: {
      message: 'Response {number, number} for {source}: {response}',
      context:
        'Accessible label for a filled answer slot on one row of a match question. A row can hold several responses, so {number} is the position within that row.',
    },
    rowLabel: {
      message: 'Responses matched with {source}',
      context: 'Accessible label for the group of answers a learner has matched with one item',
    },
  });

  const { responsePoolLabel$, emptyEntryPlaceholder$, entryEmpty$, entryFilled$, rowLabel$ } =
    matchStrings;

  const $themeTokens = themeTokens();
  const $themePalette = themePalette();
  const $themeBrand = themeBrand();

  const interactionCSSVars = { '--qti-match-color-primary': $themeTokens.primary };

  function choicesIn(setVNode) {
    const children = setVNode?.componentOptions?.children || [];
    return children.filter(vnode => getComponentTag(vnode) === CHOICE_TAG);
  }

  export default {
    name: 'QtiMatchInteraction',
    tag: 'qti-match-interaction',

    setup(props, { slots, attrs }) {
      const QTI_CONTEXT = inject('QTI_CONTEXT');
      const responses = inject('responses');
      const interactive = inject('interactive');
      const typedProps = useTypedProps(props);

      // The sets are static: parse the slot vnodes once rather than every render.
      const allContent = (slots.default && slots.default()) || [];
      const nonSetContent = allContent.filter(vnode => getComponentTag(vnode) !== SET_TAG);
      const setVNodes = allContent.filter(vnode => getComponentTag(vnode) === SET_TAG);

      // The first set defines the sources, the second the targets a source is
      // paired with. Every row is one source; the pool is the whole second set.
      const sourceChoices = choicesIn(setVNodes[0]).map(vnode => ({
        identifier: vnode.componentOptions.propsData.identifier,
        fixed: isFixed(vnode),
      }));
      const targetChoices = choicesIn(setVNodes[1]).map(vnode => ({
        identifier: vnode.componentOptions.propsData.identifier,
        fixed: isFixed(vnode),
      }));

      const contentByIdentifier = {};
      const textByIdentifier = {};
      const matchMaxByIdentifier = {};
      [...choicesIn(setVNodes[0]), ...choicesIn(setVNodes[1])].forEach(vnode => {
        const { identifier, matchMax } = vnode.componentOptions.propsData;
        contentByIdentifier[identifier] = vnode.componentOptions.children || [];
        textByIdentifier[identifier] = choiceText(vnode);
        matchMaxByIdentifier[identifier] = matchMax === undefined ? 1 : Number(matchMax);
      });

      const matchMaxOf = identifier => matchMaxByIdentifier[identifier] ?? 1;
      const labelFor = identifier => textByIdentifier[identifier] || identifier;

      // Shuffle randomises each set independently, so the two are seeded apart:
      // sets of equal length would otherwise take the same permutation.
      const seed = () => QTI_CONTEXT.value.candidateIdentifier;
      const sourceIds = computed(() =>
        orderChoices(sourceChoices, { shuffle: typedProps.shuffle.value, seed: seed() }).map(
          choice => choice.identifier,
        ),
      );
      const targetIds = computed(() =>
        orderChoices(targetChoices, {
          shuffle: typedProps.shuffle.value,
          seed: `${seed()}-targets`,
        }).map(choice => choice.identifier),
      );

      const {
        rows,
        pool,
        pairs,
        entriesFor,
        currentValue,
        isExhausted,
        canPlace,
        place,
        clear,
        remove,
        candidatesFor,
        hydrate,
      } = useMatchRows({
        sourceIds,
        targetIds,
        matchMaxOf,
        maxAssociations: computed(() => typedProps.maxAssociations.value),
      });

      const { isDragging, draggedItem } = useDraggableUniverse();

      let dragOriginRow = null;

      const variable = computed(() => responses.value[typedProps.responseIdentifier.value]);

      // Only one of these is ever set: the learner either picks a response and
      // then a target, or picks a target and then a response.
      const selectedIdentifier = ref(null);
      const activeEntry = ref(null);

      function clearSelection() {
        selectedIdentifier.value = null;
        activeEntry.value = null;
      }

      function isActiveEntry(rowIndex, entryIndex) {
        return (
          activeEntry.value?.rowIndex === rowIndex && activeEntry.value?.entryIndex === entryIndex
        );
      }

      function selectResponse(identifier) {
        if (!interactive.value || isExhausted(identifier)) {
          return;
        }
        if (activeEntry.value) {
          place(identifier, activeEntry.value.rowIndex, activeEntry.value.entryIndex);
          clearSelection();
          return;
        }
        selectedIdentifier.value = selectedIdentifier.value === identifier ? null : identifier;
      }

      function selectEntry(rowIndex, entryIndex) {
        if (!interactive.value) {
          return;
        }
        if (selectedIdentifier.value) {
          place(selectedIdentifier.value, rowIndex, entryIndex);
          clearSelection();
          return;
        }
        if (isActiveEntry(rowIndex, entryIndex)) {
          clearSelection();
          return;
        }
        // A target is reusable, so there is nothing to pick up and carry from a
        // filled position: clicking it takes that pairing back out instead.
        if (currentValue(rowIndex, entryIndex)) {
          clear(rowIndex, entryIndex);
          clearSelection();
          return;
        }
        activeEntry.value = { rowIndex, entryIndex };
      }

      function reconcileRow(rowIndex, newItems) {
        if (!interactive.value) {
          return;
        }
        const identifiers = newItems.map(item => item.identifier);
        const current = rows.value[rowIndex];

        const arrived = identifiers.find(identifier => !current.includes(identifier));
        if (arrived) {
          if (dragOriginRow !== null && dragOriginRow !== rowIndex) {
            remove(arrived, dragOriginRow);
          }
          place(arrived, rowIndex, rows.value[rowIndex].length);
          return;
        }

        // Only the row the drag started from can report a departure; a move to
        // another row has already taken the target out above.
        const departed = current.find(identifier => !identifiers.includes(identifier));
        if (departed && dragOriginRow === rowIndex) {
          remove(departed, rowIndex);
        }
      }

      // The variable is derived from the rows, so ignore the change our own
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

      watch(interactive, clearSelection);

      const poolStyles = computed(() => ({
        backgroundColor: $themePalette.grey.v_100,
        borderColor: $themeTokens.fineLine,
      }));
      const poolLabelStyles = computed(() => ({ color: $themeTokens.annotation }));
      const placeholderStyles = computed(() => ({ color: $themeTokens.annotation }));

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

      function entryStyles({ filled, target, active }) {
        if (target || active) {
          return {
            backgroundColor: $themeBrand.primary.v_50,
            borderColor: $themeTokens.primary,
          };
        }
        return {
          backgroundColor: filled ? $themePalette.grey.v_100 : 'transparent',
          borderColor: $themeTokens.fineLine,
        };
      }

      function entryLabel(identifier, rowIndex, entryIndex) {
        const source = labelFor(sourceIds.value[rowIndex]);
        if (!identifier) {
          return entryEmpty$({ source });
        }
        return entryFilled$({
          number: entryIndex + 1,
          source,
          response: labelFor(identifier),
        });
      }

      // The whole chip is the drag handle, so DraggableHandle renders the chip
      // itself rather than wrapping it in another element.
      function renderChip(
        identifier,
        { exhausted = false, selected = false, candidate = false, draggable = true, on } = {},
      ) {
        const data = {
          class: [
            'qti-match-chip',
            {
              'qti-match-chip-exhausted': exhausted,
              'qti-match-chip-selected': selected,
              'qti-match-chip-candidate': candidate && !selected,
            },
          ],
          style: chipStyles({ exhausted, selected, candidate }),
          attrs: exhausted ? { 'aria-disabled': 'true' } : {},
          on,
        };
        const content = [...contentByIdentifier[identifier]];
        if (!draggable) {
          return h('div', data, content);
        }
        return h(DraggableHandle, { ...data, props: { tag: 'div' } }, content);
      }

      function renderPlaceholder() {
        return h(
          'span',
          {
            class: 'qti-match-placeholder',
            style: placeholderStyles.value,
            attrs: { 'aria-hidden': 'true' },
          },
          [
            h('KIcon', { props: { icon: 'plus' }, class: 'qti-match-placeholder-icon' }),
            h('span', emptyEntryPlaceholder$()),
          ],
        );
      }

      // Whether the pool should offer this target for the entry awaiting one
      function isCandidateForActiveEntry(identifier) {
        if (!activeEntry.value) {
          return false;
        }
        const { rowIndex, entryIndex } = activeEntry.value;
        return candidatesFor(rowIndex, entryIndex).includes(identifier);
      }

      // What is being offered for placement right now, by pointer or by drag
      function offeredIdentifier() {
        if (selectedIdentifier.value) {
          return selectedIdentifier.value;
        }
        return isDragging.value ? draggedItem.value?.identifier : null;
      }

      function renderEntry(identifier, rowIndex, entryIndex) {
        const filled = Boolean(identifier);
        const active = isActiveEntry(rowIndex, entryIndex);
        const offered = offeredIdentifier();
        // A filled position is still a valid target here, because a target may
        // be replaced — so unlike associate, filled positions do highlight.
        const target = Boolean(
          offered && canPlace(offered, rowIndex, entryIndex, { fromRow: dragOriginRow }),
        );
        const data = {
          key: `${rowIndex}-${entryIndex}`,
          class: [
            'qti-match-entry',
            {
              'qti-match-entry-filled': filled,
              'qti-match-entry-target': target,
              'qti-match-entry-active': active,
            },
          ],
          style: entryStyles({ filled, target, active }),
          attrs: { 'aria-label': entryLabel(identifier, rowIndex, entryIndex) },
        };
        // A filled entry is one of its row region's draggable items; the
        // trailing empty one is not, so SortableJS's indexes stay aligned.
        if (!filled) {
          return h('div', { ...data, on: { click: () => selectEntry(rowIndex, entryIndex) } }, [
            renderPlaceholder(),
          ]);
        }
        return h(
          DraggableItem,
          {
            ...data,
            props: { tag: 'div', disabled: !interactive.value },
            nativeOn: { click: () => selectEntry(rowIndex, entryIndex) },
          },
          [renderChip(identifier)],
        );
      }

      function renderPool() {
        return h('div', { class: 'qti-match-pool', style: poolStyles.value }, [
          h(
            'p',
            {
              class: 'qti-match-pool-label',
              style: poolLabelStyles.value,
              attrs: { 'aria-hidden': 'true' },
            },
            responsePoolLabel$(),
          ),
          h(
            DraggableRegion,
            {
              props: {
                tag: 'ul',
                // Exhausted chips stay visible but are not draggable, so they
                // are left out of the region's items to keep its indexes aligned
                items: pool.value
                  .filter(identifier => !isExhausted(identifier))
                  .map(identifier => ({ identifier })),
                sortable: false,
                disabled: !interactive.value,
                label: responsePoolLabel$(),
              },
              class: 'qti-match-pool-items',
              attrs: { 'aria-label': responsePoolLabel$() },
              on: {
                dragstart: () => {
                  dragOriginRow = null;
                },
              },
            },
            pool.value.map(identifier => {
              const exhausted = isExhausted(identifier);
              const chip = renderChip(identifier, {
                exhausted,
                draggable: !exhausted,
                selected: selectedIdentifier.value === identifier,
                candidate: isCandidateForActiveEntry(identifier),
                on: { click: () => selectResponse(identifier) },
              });
              if (exhausted) {
                return h('li', { key: identifier, class: 'qti-match-pool-entry' }, [chip]);
              }
              return h(
                DraggableItem,
                {
                  key: identifier,
                  class: 'qti-match-pool-entry',
                  props: { tag: 'li', disabled: !interactive.value },
                },
                [chip],
              );
            }),
          ),
        ]);
      }

      function renderRows() {
        return h(
          'ol',
          { class: 'qti-match-rows' },
          rows.value.map((row, rowIndex) => {
            const sourceId = sourceIds.value[rowIndex];
            return h('li', { key: sourceId, class: 'qti-match-row' }, [
              h(
                'div',
                {
                  class: 'qti-match-source',
                  style: {
                    backgroundColor: $themeTokens.surface,
                    borderColor: $themeTokens.fineLine,
                  },
                },
                [...contentByIdentifier[sourceId]],
              ),
              h(
                'span',
                {
                  class: 'qti-match-arrow',
                  style: { color: $themeTokens.annotation },
                  attrs: { 'aria-hidden': 'true' },
                },
                '→',
              ),
              h(
                DraggableRegion,
                {
                  props: {
                    tag: 'div',
                    items: row.map(identifier => ({ identifier })),
                    sortable: false,
                    disabled: !interactive.value,
                    label: rowLabel$({ source: labelFor(sourceId) }),
                  },
                  class: 'qti-match-entries',
                  attrs: { 'aria-label': rowLabel$({ source: labelFor(sourceId) }) },
                  on: {
                    dragstart: () => {
                      dragOriginRow = rowIndex;
                    },
                    'update:items': newItems => reconcileRow(rowIndex, newItems),
                  },
                },
                entriesFor(rowIndex).map((identifier, entryIndex) =>
                  renderEntry(identifier, rowIndex, entryIndex),
                ),
              ),
            ]);
          }),
        );
      }

      return () => {
        if (!sourceChoices.length || !targetChoices.length) {
          return;
        }

        return h('div', [
          ...nonSetContent,
          h(AnswerGuide, { props: { text: answerGuideStrings.chooseThenTarget$() } }),
          h(
            'div',
            {
              class: [
                attrs.class || '',
                'qti-match-interaction',
                { 'qti-match-readonly': !interactive.value },
              ],
              style: interactionCSSVars,
            },
            [renderPool(), renderRows()],
          ),
        ]);
      };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      responseIdentifier: QTIIdentifierProp(true),
      shuffle: BooleanProp(false, false),
      maxAssociations: NonNegativeIntProp(false, 0),
      minAssociations: NonNegativeIntProp(false, 0),
      /* eslint-enable */
    },
  };

</script>


<!-- Not scoped: the chips wrap authored QTI content, whose vnodes are created by
     the item body's SafeHTML render and so carry a different scope id. -->
<style lang="scss">

  $chip-max-size: 100px;
  $chip-padding-block: 8px;
  $chip-padding-inline: 12px;
  $chip-border-width: 1px;
  $chip-content-max-size: $chip-max-size - 2 * ($chip-padding-inline + $chip-border-width);

  .qti-match-pool {
    padding: 0.75rem;
    margin-bottom: 1rem;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

  .qti-match-pool-label {
    margin: 0 0 0.5rem;
    font-size: 12px;
  }

  .qti-match-pool-items {
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

  .qti-match-chip {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: $chip-max-size;
    padding-block: $chip-padding-block;
    padding-inline: $chip-padding-inline;
    overflow: hidden;
    cursor: pointer;
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

  .qti-match-chip-selected {
    font-weight: 600;
  }

  // Every use spent, so it can no longer be matched with anything
  .qti-match-chip-exhausted {
    cursor: default;
    opacity: 0.55;
  }

  // Review mode has nothing to click
  .qti-match-readonly {
    .qti-match-chip,
    .qti-match-entry {
      cursor: default;
    }
  }

  .qti-match-rows {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .qti-match-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .qti-match-source {
    display: flex;
    flex: 1;
    align-items: center;
    min-height: 56px;
    padding-block: $chip-padding-block;
    padding-inline: $chip-padding-inline;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

  .qti-match-arrow {
    flex-shrink: 0;
  }

  .qti-match-entries {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    min-height: 56px;
  }

  .qti-match-entry {
    display: flex;
    align-items: center;
    min-height: 40px;
    padding: 8px;
    cursor: pointer;
    border-style: dashed;
    border-width: 1px;
    border-radius: 8px;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;
  }

  .qti-match-entry-filled {
    border-style: solid;
  }

  .qti-match-placeholder {
    display: flex;
    gap: 4px;
    align-items: center;
  }

</style>
