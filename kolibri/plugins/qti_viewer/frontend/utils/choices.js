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

/**
 * Plain text for a vnode's content. Image content contributes its alt text,
 * which is all a choice made of a single image has to identify it by.
 * @param {object} vnode - Any vnode
 * @returns {string} The text, or '' when there is none
 */
export function vnodeToText(vnode) {
  if (!vnode) {
    return '';
  }
  if (vnode.text) {
    return vnode.text.trim();
  }
  const alt = vnode.componentOptions?.propsData?.alt ?? vnode.data?.attrs?.alt;
  if (alt) {
    return String(alt).trim();
  }
  const children = vnode.componentOptions?.children ?? vnode.children;
  if (children) {
    return children.map(vnodeToText).join(' ').trim();
  }
  return '';
}

/**
 * A choice's own content as a single line of text, for accessible names and
 * live-region announcements.
 * @param {object} vnode - A choice vnode
 * @returns {string} The collapsed text of the choice's children
 */
export function choiceText(vnode) {
  return (get(vnode, ['componentOptions', 'children']) || [])
    .map(vnodeToText)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
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
