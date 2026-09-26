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
 * Every vnode in a tree that was rendered from one of the given QTI tags, in
 * document order.
 *
 * Most interactions pick their choices out of the default slot with a flat
 * filter, because that is where the author has to put them. An interaction
 * whose answer slots are embedded in its own flow content cannot: a `qti-gap`
 * sits wherever the passage puts it — inside a blockquote, a table cell, a
 * paragraph — so finding them means walking the tree.
 *
 * A match is not descended into: the QTI elements this looks for do not nest
 * inside one another.
 * @param {Array} vnodes - The vnodes to search, e.g. an interaction's slot content
 * @param {string[]} tags - The QTI tags to match, e.g. `['qti-gap']`
 * @returns {Array} The matching vnodes, in the order they appear in the item body
 */
export function findVNodes(vnodes, tags) {
  const found = [];

  function visit(nodes) {
    for (const vnode of nodes || []) {
      if (!vnode) {
        continue;
      }
      if (tags.includes(getComponentTag(vnode))) {
        found.push(vnode);
        continue;
      }
      // A component keeps the children it was given under componentOptions;
      // a plain element keeps them directly. Text vnodes have neither.
      visit(vnode.componentOptions ? vnode.componentOptions.children : vnode.children);
    }
  }

  visit(vnodes);
  return found;
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
