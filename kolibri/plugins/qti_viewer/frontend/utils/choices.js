/**
 * Reading the choice vnodes an interaction receives in its default slot.
 *
 * The choice-based interactions are all handed the item body's authored content
 * as vnodes and have to pick their own choices out of it, label them, and decide
 * what order to present them in. That is the same work in each one.
 * @module choices
 */
import get from 'lodash/get';
import shuffled from 'kolibri-common/utils/shuffled';
import { coerceBoolean } from './qti/values';

/**
 * The QTI tag a vnode was rendered from, or undefined for plain content.
 * @param {object} vnode - A vnode from an interaction's default slot
 * @returns {string|undefined} e.g. `qti-simple-choice`
 */
export function getComponentTag(vnode) {
  return get(vnode, ['componentOptions', 'Ctor', 'extendOptions', 'tag']);
}

/**
 * Whether a choice is marked `fixed`, and so keeps its authored position when
 * the rest are shuffled.
 * @param {object} vnode - A choice vnode
 * @returns {boolean} True when the choice declares fixed="true"
 */
export function isFixed(vnode) {
  return coerceBoolean(get(vnode, ['componentOptions', 'propsData', 'fixed']));
}

const LABEL_ATTRIBUTES = ['alt', 'aria-label', 'alttext'];

/**
 * Plain text for a vnode's content.
 * @param {object} vnode - Any vnode
 * @param {object} [options] - How hidden content is treated
 * @param {boolean} [options.visible] - Keep `aria-hidden` content, for text shown on screen
 * @returns {string} The text, or '' when there is none
 */
export function vnodeToText(vnode, { visible = false } = {}) {
  if (!vnode) {
    return '';
  }
  if (vnode.text) {
    return vnode.text.trim();
  }
  const attrs = vnode.data?.attrs;
  if (!visible && attrs?.['aria-hidden'] === 'true') {
    return '';
  }
  const props = vnode.componentOptions?.propsData;
  const label = LABEL_ATTRIBUTES.map(name =>
    String(props?.[name] ?? attrs?.[name] ?? '').trim(),
  ).find(Boolean);
  if (label) {
    return label;
  }
  const children = vnode.componentOptions?.children ?? vnode.children;
  if (children) {
    return children
      .map(child => vnodeToText(child, { visible }))
      .join(' ')
      .trim();
  }
  return '';
}

/**
 * A choice's own content as a single line of text, for accessible names and
 * live-region announcements.
 * @param {object} vnode - A choice vnode
 * @param {object} [options] - Passed to `vnodeToText`
 * @returns {string} The collapsed text of the choice's children
 */
export function choiceText(vnode, options = {}) {
  const text = (get(vnode, ['componentOptions', 'children']) || [])
    .map(child => vnodeToText(child, options))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text || options.visible) {
    return text;
  }
  return choiceText(vnode, { visible: true });
}

/**
 * Present choices in their authored order, or shuffled when the item asks for
 * it. Choices marked `fixed` keep their authored position either way, and the
 * shuffle is seeded so a learner sees the same order every time they return.
 * @param {Array<{fixed: boolean}>} choices - Choices in authored order
 * @param {object} options - Ordering options
 * @param {boolean} options.shuffle - The interaction's shuffle attribute
 * @param {string} options.seed - Seed for the shuffle, usually the candidate id
 * @returns {Array} The choices in presentation order
 */
export function orderChoices(choices, { shuffle, seed }) {
  if (!shuffle) {
    return choices;
  }
  const shuffleable = shuffled(
    choices.filter(choice => !choice.fixed),
    seed,
  );
  return choices.map(choice => (choice.fixed ? choice : shuffleable.shift()));
}
