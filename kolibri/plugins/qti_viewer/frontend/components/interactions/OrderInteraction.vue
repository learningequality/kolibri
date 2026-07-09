<script>

  import get from 'lodash/get';
  import shuffled from 'kolibri-common/utils/shuffled';
  import { computed, h, inject, watch } from 'vue';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import DragContainer from 'kolibri-common/components/sortable/DragContainer';
  import DragHandle from 'kolibri-common/components/sortable/DragHandle';
  import DragSortWidget from 'kolibri-common/components/sortable/DragSortWidget';
  import Draggable from 'kolibri-common/components/sortable/Draggable';
  import AnswerGuide, { answerGuideStrings } from '../AnswerGuide.vue';
  import { BooleanProp, OrientationProp, QTIIdentifierProp } from '../../utils/props';
  import useTypedProps from '../../composables/useTypedProps';
  import { Orientation } from '../../constants';

  const strings = createTranslator('OrderInteractionStrings', {
    orderListLabel: {
      message: 'Answer choices to reorder',
      context:
        'Accessible label for the reorderable list of answer choices in an order interaction',
    },
  });

  const { orderListLabel$ } = strings;

  const $themeTokens = themeTokens();

  function getComponentTag(vnode) {
    return get(vnode, ['componentOptions', 'Ctor', 'extendOptions', 'tag']);
  }

  // qti-choices-top/bottom/left/right are intentional no-ops
  const LABEL_FNS = {
    'qti-labels-decimal': i => String(i + 1),
    'qti-labels-upper-alpha': i => String.fromCharCode(65 + i),
    'qti-labels-lower-alpha': i => String.fromCharCode(97 + i),
  };

  const LABEL_SUFFIXES = {
    'qti-labels-suffix-period': '.',
    'qti-labels-suffix-parenthesis': ')',
  };

  export default {
    name: 'QtiOrderInteraction',
    tag: 'qti-order-interaction',

    setup(props, { slots, attrs }) {
      const QTI_CONTEXT = inject('QTI_CONTEXT');
      const responses = inject('responses');
      const interactive = inject('interactive');
      const typedProps = useTypedProps(props);

      const shuffle = typedProps.shuffle;
      const orientation = computed(() => typedProps.orientation.value || Orientation.VERTICAL);
      const responseIdentifier = typedProps.responseIdentifier;
      const isHorizontal = computed(() => orientation.value === Orientation.HORIZONTAL);
      const orderGuideText = computed(() =>
        isHorizontal.value ? answerGuideStrings.orderKeyboard$() : answerGuideStrings.order$(),
      );

      const labelFn = computed(() => {
        const cls = attrs.class || '';
        const classes = typeof cls === 'string' ? cls.split(' ') : cls;
        const baseKey = Object.keys(LABEL_FNS).find(key => classes.includes(key));
        if (!baseKey) return null;
        const suffix = Object.keys(LABEL_SUFFIXES).find(key => classes.includes(key));
        const suffixChar = suffix ? LABEL_SUFFIXES[suffix] : '';
        return i => LABEL_FNS[baseKey](i) + suffixChar;
      });

      const allContent = slots.default();
      const nonChoiceContent = allContent.filter(
        vnode => getComponentTag(vnode) !== 'qti-simple-choice',
      );
      const choiceVNodes = allContent.filter(
        vnode => getComponentTag(vnode) === 'qti-simple-choice',
      );

      const contentByIdentifier = choiceVNodes.reduce((acc, vnode) => {
        acc[vnode.componentOptions.propsData.identifier] = vnode.componentOptions.children;
        return acc;
      }, {});
      const allIdentifiers = choiceVNodes.map(vnode => vnode.componentOptions.propsData.identifier);

      // Plain-text label per choice, used for move-button and full-order a11y announcements.
      function vnodeToText(vnode) {
        if (!vnode) {
          return '';
        }
        if (vnode.text) {
          return vnode.text.trim();
        }
        if (vnode.children) {
          return vnode.children.map(vnodeToText).join(' ').trim();
        }
        return '';
      }

      const textByIdentifier = {};
      choiceVNodes.forEach(vnode => {
        const identifier = vnode.componentOptions.propsData.identifier;
        textByIdentifier[identifier] = vnode.componentOptions.children
          .map(vnodeToText)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      });

      function getVariable() {
        return responses[responseIdentifier.value];
      }

      const currentOrder = computed(() => {
        const variable = getVariable();
        return variable && Array.isArray(variable.value) ? variable.value : [];
      });

      function isValidOrder(order) {
        return (
          order.length === allIdentifiers.length && allIdentifiers.every(id => order.includes(id))
        );
      }

      function deriveInitialOrder() {
        return shuffle.value
          ? shuffled([...allIdentifiers], QTI_CONTEXT.value.candidateIdentifier)
          : [...allIdentifiers];
      }

      // Ensure that the variable is initialized to a valid order on first render
      // may be a useless check
      watch(
        currentOrder,
        order => {
          if (!isValidOrder(order)) {
            const variable = getVariable();
            if (variable) {
              variable.value = deriveInitialOrder();
            }
          }
        },
        { immediate: true },
      );

      function handleSort({ newArray }) {
        if (!interactive.value) {
          return;
        }
        const variable = getVariable();
        if (variable) {
          variable.value = newArray.map(item => item.identifier);
        }
      }

      function moveItem(identifier, direction) {
        if (!interactive.value) {
          return;
        }
        const order = [...currentOrder.value];
        const index = order.indexOf(identifier);
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= order.length) {
          return;
        }
        [order[index], order[newIndex]] = [order[newIndex], order[index]];
        const variable = getVariable();
        if (variable) {
          variable.value = order;
        }
      }

      // shared pieces between interactive/read-only rendering
      function renderLabel(index) {
        const fn = labelFn.value;
        return fn ? h('span', { class: 'qti-order-label' }, fn(index)) : null;
      }

      function listClasses(extra) {
        return [
          attrs.class || '',
          'qti-order-interaction',
          { 'qti-orientation-horizontal': isHorizontal.value },
          ...(extra || []),
        ];
      }

      return () => {
        const items = currentOrder.value.map(identifier => ({ identifier }));
        if (items.length === 0) {
          return;
        }

        const rowStyle = {
          backgroundColor: $themeTokens.surface,
          borderColor: $themeTokens.fineLine,
        };

        if (!interactive.value) {
          // Report/review mode: no drag handles or move buttons
          return h('div', [
            ...nonChoiceContent,
            h(AnswerGuide, { props: { text: orderGuideText.value } }),
            h(
              'ol',
              {
                attrs: { 'aria-label': orderListLabel$() },
                class: listClasses(['qti-order-interaction-readonly']),
              },
              items.map((item, index) =>
                h(
                  'li',
                  { key: item.identifier, class: 'qti-order-row-wrapper' },
                  [
                    renderLabel(index),
                    h(
                      'div',
                      { class: 'qti-order-row', style: rowStyle },
                      contentByIdentifier[item.identifier],
                    ),
                  ].filter(Boolean),
                ),
              ),
            ),
          ]);
        }

        return h('div', [
          ...nonChoiceContent,
          h(AnswerGuide, { props: { text: orderGuideText.value } }),
          h(
            DragContainer,
            {
              props: {
                items,
              },
              on: { sort: handleSort },
            },
            [
              h(
                'ul',
                {
                  attrs: { 'aria-label': orderListLabel$() },
                  class: listClasses(),
                },
                items.map((item, index) =>
                  h(Draggable, { key: item.identifier }, [
                    h(
                      'li',
                      { class: 'qti-order-row-wrapper' },
                      [
                        // Label sits outside the card, updates reactively
                        renderLabel(index),
                        h('div', { class: 'qti-order-row', style: rowStyle }, [
                          h(DragHandle, [
                            h(DragSortWidget, {
                              props: {
                                isFirst: index === 0,
                                isLast: index === items.length - 1,
                                horizontal: isHorizontal.value,
                                itemLabel: textByIdentifier[item.identifier],
                                position: index + 1,
                                total: items.length,
                              },
                              on: {
                                moveUp: () => moveItem(item.identifier, -1),
                                moveDown: () => moveItem(item.identifier, 1),
                                mousedown: e => e.preventDefault(),
                              },
                            }),
                          ]),
                          h(
                            'div',
                            { class: 'qti-order-row-content' },
                            contentByIdentifier[item.identifier],
                          ),
                        ]),
                      ].filter(Boolean),
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ]);
      };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      shuffle: BooleanProp(false, false),
      orientation: OrientationProp(false, Orientation.VERTICAL),
      responseIdentifier: QTIIdentifierProp(true),
      /* eslint-enable */
    },
  };

</script>


<style lang="scss" scoped>

  .qti-order-interaction {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .qti-order-row-wrapper {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-block-end: 8px;

    &:last-child {
      margin-block-end: 0;
    }
  }

  .qti-order-label {
    flex-shrink: 0;
    min-width: 1.5rem;
    font-weight: 600;
    text-align: end;
  }

  // the card itself
  .qti-order-row {
    display: flex;
    flex: 1;
    align-items: center;
    padding-block: 12px;
    padding-inline: 16px;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

  .qti-order-row-content {
    flex: 1;
    margin-inline-start: 12px;
  }

  // Horizontal
  .qti-order-interaction.qti-orientation-horizontal {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .qti-order-row-wrapper {
      // Label goes above the card in horizontal mode
      flex-direction: column;
      align-items: center;
      margin-block-end: 0;
    }

    .qti-order-label {
      text-align: center;
    }
  }

  .qti-order-interaction-readonly .qti-order-row {
    cursor: default;
  }

</style>
