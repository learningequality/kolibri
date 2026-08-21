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
  import useMatchRows, { PROBLEM } from '../../composables/useMatchRows';
  import useSlotListbox from '../../composables/useSlotListbox';

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
    refusedAlreadyInRow: {
      message: '{response} is already matched with {source}.',
      context:
        'Explains why a response the learner tried to place was not accepted: that pairing already exists',
    },
    refusedRowFull: {
      message: '{source} already has as many responses as it can take.',
      context:
        'Explains why a response the learner tried to place was not accepted: the item being matched has reached its limit',
    },
    refusedNoUsesLeft: {
      message: '{response} has already been matched as many times as it can be.',
      context:
        'Explains why a response the learner tried to place was not accepted: that response has reached its own limit',
    },
    refusedMaxAssociations: {
      message:
        'You can make {count, number} {count, plural, one {match} other {matches}} in this question. Remove one to make a different match.',
      context:
        'Explains why a response the learner tried to place was not accepted: the question has a limit on the total number of matches',
    },
  });

  const {
    responsePoolLabel$,
    emptyEntryPlaceholder$,
    entryEmpty$,
    entryFilled$,
    rowLabel$,
    refusedAlreadyInRow$,
    refusedRowFull$,
    refusedNoUsesLeft$,
    refusedMaxAssociations$,
  } = matchStrings;

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
        isPlaceable,
        canPlace,
        placementProblem,
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

      // Why the last attempted placement was refused. A refusal is otherwise
      // silent: the response simply springs back, with nothing to say which of
      // the item's limits stopped it.
      const refusal = ref(null);

      function explain(problem, identifier, rowIndex) {
        const response = labelFor(identifier);
        const source = labelFor(sourceIds.value[rowIndex]);
        if (problem === PROBLEM.ALREADY_IN_ROW) {
          return refusedAlreadyInRow$({ response, source });
        }
        if (problem === PROBLEM.ROW_FULL) {
          return refusedRowFull$({ source });
        }
        if (problem === PROBLEM.NO_USES_LEFT) {
          return refusedNoUsesLeft$({ response });
        }
        // ALREADY_HERE and UNKNOWN are not worth interrupting a learner over
        return null;
      }

      // The single way a placement is attempted, so no path can refuse silently
      function attemptPlace(identifier, rowIndex, entryIndex) {
        const problem = placementProblem(identifier, rowIndex, entryIndex);
        if (problem) {
          refusal.value = explain(problem, identifier, rowIndex);
          return false;
        }
        refusal.value = null;
        place(identifier, rowIndex, entryIndex);
        return true;
      }

      function isActiveEntry(rowIndex, entryIndex) {
        return (
          activeEntry.value?.rowIndex === rowIndex && activeEntry.value?.entryIndex === entryIndex
        );
      }

      function selectResponse(identifier) {
        if (!interactive.value || !isPlaceable(identifier)) {
          return;
        }
        if (activeEntry.value) {
          attemptPlace(identifier, activeEntry.value.rowIndex, activeEntry.value.entryIndex);
          clearSelection();
          return;
        }
        selectedIdentifier.value = selectedIdentifier.value === identifier ? null : identifier;
      }

      function selectEntry(rowIndex, entryIndex) {
        listbox.forgetPointer();
        if (!interactive.value) {
          return;
        }
        if (selectedIdentifier.value) {
          attemptPlace(selectedIdentifier.value, rowIndex, entryIndex);
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

      // Keyboard navigation is only for the entries, not the pool. An entry is
      // addressed by (row, position), so a row holding several targets gets a
      // listbox per position.
      const listbox = useSlotListbox({
        candidatesFor,
        currentValue,
        commit: attemptPlace,
        clear,
        labelFor,
        disabled: computed(() => !interactive.value),
        onKeyboardFocus: clearSelection,
        // Only a row's first position answers itself on focus. A trailing
        // position is an invitation to add another pairing rather than an
        // unanswered one, so tabbing past it has to leave the row alone —
        // otherwise tabbing through fills every row to its capacity.
        autoFillOnFocus: (rowIndex, entryIndex) => entryIndex === 0,
      });

      function reconcileRow(rowIndex, newItems) {
        if (!interactive.value) {
          return;
        }
        // The empty position rides along as a null item; only real pairings count
        const identifiers = newItems.map(item => item.identifier).filter(Boolean);
        const current = rows.value[rowIndex];

        const arrived = identifiers.find(identifier => !current.includes(identifier));
        if (arrived) {
          if (dragOriginRow !== null && dragOriginRow !== rowIndex) {
            remove(arrived, dragOriginRow);
          }
          // Prefer the row's free position. A row with none is not a dead end:
          // dropping on it replaces the pairing nearest where it landed, which
          // is the only reading of the gesture that is not a silent no-op.
          const positions = entriesFor(rowIndex);
          const freeIndex = positions.indexOf(null);
          const entryIndex =
            freeIndex === -1
              ? Math.min(identifiers.indexOf(arrived), positions.length - 1)
              : freeIndex;
          attemptPlace(arrived, rowIndex, entryIndex);
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

      watch(interactive, () => {
        clearSelection();
        refusal.value = null;
      });

      // A refusal explains one attempt, not the state of the question: once the
      // rows change the learner has moved on and it is stale.
      watch(rows, () => {
        refusal.value = null;
      });

      const atMaxAssociations = computed(() => {
        const max = typedProps.maxAssociations.value;
        return max > 0 && pairs.value.length >= max;
      });

      // A refusal is about what the learner just did, so it wins while it stands
      const notice = computed(() => {
        if (refusal.value) {
          return refusal.value;
        }
        return atMaxAssociations.value
          ? refusedMaxAssociations$({ count: typedProps.maxAssociations.value })
          : null;
      });

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

      // The whole answer field is the drop area, so it carries the highlight
      function fieldStyles({ target, active }) {
        if (target || active) {
          return {
            backgroundColor: $themeBrand.primary.v_50,
            borderColor: $themeTokens.primary,
          };
        }
        return { backgroundColor: 'transparent', borderColor: $themeTokens.fineLine };
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

      // The whole chip is the drag handle, so DraggableHandle marks the chip itself
      // rather than wrapping it in another element.
      function renderChip(
        identifier,
        {
          exhausted = false,
          selected = false,
          candidate = false,
          draggable = true,
          ariaHidden = false,
          on,
        } = {},
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
          attrs: {
            ...(exhausted ? { 'aria-disabled': 'true' } : {}),
            ...(ariaHidden ? { 'aria-hidden': 'true' } : {}),
          },
          on,
        };
        const content = [...contentByIdentifier[identifier]];
        if (!draggable) {
          return h('div', data, content);
        }
        return h(DraggableHandle, [h('div', data, content)]);
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

      // The answer field takes the highlight when any of its positions would
      // accept what is being offered — including a filled one, since a response
      // there can be replaced.
      function isFieldTarget(rowIndex) {
        const offered = offeredIdentifier();
        if (!offered) {
          return false;
        }
        return entriesFor(rowIndex).some((_, entryIndex) =>
          canPlace(offered, rowIndex, entryIndex, { fromRow: dragOriginRow }),
        );
      }

      function renderEntry(identifier, rowIndex, entryIndex) {
        const filled = Boolean(identifier);
        const data = {
          class: ['qti-match-entry', { 'qti-match-entry-filled': filled }],
          attrs: {
            'aria-label': entryLabel(identifier, rowIndex, entryIndex),
            ...listbox.slotAttrs(rowIndex, entryIndex),
          },
          on: {
            click: () => selectEntry(rowIndex, entryIndex),
            ...listbox.handlers(rowIndex, entryIndex),
          },
        };
        const children = [
          // The visible value is the listbox's trigger: its content repeats the
          // selected option, which the listbox already announces.
          filled ? renderChip(identifier, { ariaHidden: true }) : renderPlaceholder(),
          listbox.renderStepper(),
          interactive.value ? listbox.renderOptions(rowIndex, entryIndex) : null,
        ].filter(Boolean);
        // Every entry is a DraggableItem, empty ones included, so that filling
        // one patches the element in place. Swapping element type here would
        // destroy the element the learner just tabbed to and drop their focus
        // before they could press an arrow. Empty entries are disabled, so they
        // cannot be dragged, but they stay in the region's item list to keep
        // SortableJS's indexes aligned with the rendered children.
        return h(
          DraggableItem,
          {
            key: `${rowIndex}-${entryIndex}`,
            props: { disabled: !interactive.value || !filled },
          },
          [h('div', data, children)],
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
                // Exhausted chips stay visible but are not draggable, so they
                // are left out of the region's items to keep its indexes aligned
                items: pool.value
                  .filter(identifier => isPlaceable(identifier))
                  .map(identifier => ({ identifier })),
                sortable: false,
                disabled: !interactive.value,
                label: responsePoolLabel$(),
              },
              on: {
                dragstart: () => {
                  dragOriginRow = null;
                },
              },
            },
            [
              h(
                'ul',
                {
                  class: 'qti-match-pool-items',
                  attrs: { 'aria-label': responsePoolLabel$() },
                },
                pool.value.map(identifier => {
                  const exhausted = !isPlaceable(identifier);
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
                    { key: identifier, props: { disabled: !interactive.value } },
                    [h('li', { class: 'qti-match-pool-entry' }, [chip])],
                  );
                }),
              ),
            ],
          ),
        ]);
      }

      // role="status" is a live region, so the notice is announced as well as
      // shown — a screen reader user gets no springing-back chip to notice.
      function renderNotice() {
        return h(
          'p',
          {
            class: 'qti-match-notice',
            style: {
              color: $themeTokens.text,
              backgroundColor: $themePalette.grey.v_100,
              borderColor: $themeTokens.fineLine,
            },
            attrs: { role: 'status' },
          },
          notice.value ? [h('KIcon', { props: { icon: 'infoOutline' } }), notice.value] : [],
        );
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
                    // One item per rendered entry, the trailing empty position
                    // included, so SortableJS's indexes line up with the DOM
                    items: entriesFor(rowIndex).map(identifier => ({ identifier })),
                    sortable: false,
                    disabled: !interactive.value,
                    label: rowLabel$({ source: labelFor(sourceId) }),
                  },
                  on: {
                    dragstart: () => {
                      dragOriginRow = rowIndex;
                    },
                    'update:items': newItems => reconcileRow(rowIndex, newItems),
                  },
                },
                [
                  h(
                    'div',
                    {
                      class: [
                        'qti-match-field',
                        {
                          'qti-match-field-target': isFieldTarget(rowIndex),
                          'qti-match-field-active': activeEntry.value?.rowIndex === rowIndex,
                        },
                      ],
                      style: fieldStyles({
                        target: isFieldTarget(rowIndex),
                        active: activeEntry.value?.rowIndex === rowIndex,
                      }),
                      attrs: { 'aria-label': rowLabel$({ source: labelFor(sourceId) }) },
                    },
                    entriesFor(rowIndex).map((identifier, entryIndex) =>
                      renderEntry(identifier, rowIndex, entryIndex),
                    ),
                  ),
                ],
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
            [renderPool(), renderRows(), renderNotice()],
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

  $chip-max-size: 150px;
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

  .qti-match-field {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    min-height: 56px;
    padding: 8px;
    border-style: dashed;
    border-width: 1px;
    border-radius: 8px;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;
  }

  .qti-match-entry {
    display: flex;
    align-items: center;
    padding: 2px;
    cursor: pointer;
    border-radius: 8px;
  }

  .qti-match-entry:focus {
    outline: 3px solid var(--qti-match-color-primary, #4368f3);
    outline-offset: 1px;
  }

  .qti-match-placeholder {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  // Reserves no space while empty, so the rows do not jump as it comes and goes
  .qti-match-notice:not(:empty) {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0.75rem 1.125rem;
    margin: 1rem 0 0;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

</style>
