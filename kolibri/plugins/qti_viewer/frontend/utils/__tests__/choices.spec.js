import { render } from '@testing-library/vue';
import { findVNodes, getComponentTag } from '../choices';

// Stand-ins for the QTI elements SafeHTML registers. What matters is that they
// are real components carrying a `tag`, so the vnodes below are the same shape
// an interaction is handed at runtime rather than hand-built lookalikes.
function qtiElement(tag) {
  return {
    name: tag,
    tag,
    props: { identifier: { type: String, default: null } },
    render(h) {
      return h('span', this.$slots.default);
    },
  };
}

const Gap = qtiElement('qti-gap');
const GapText = qtiElement('qti-gap-text');

// Render `buildContent(h)` as the default slot of an interaction-like component
// and return what findVNodes picks out of it.
function search(buildContent, tags) {
  let found = null;
  const Interaction = {
    name: 'interaction',
    render(h) {
      found = findVNodes(this.$slots.default, tags);
      return h('div', this.$slots.default);
    },
  };
  render({
    render(h) {
      return h(Interaction, buildContent(h));
    },
  });
  return found;
}

const identifiersOf = vnodes => vnodes.map(vnode => vnode.componentOptions.propsData.identifier);

describe('findVNodes', () => {
  it('finds a gap nested inside authored markup', () => {
    const found = search(
      h => [h('blockquote', [h('p', ['Now is the ', h(Gap, { props: { identifier: 'G1' } })])])],
      ['qti-gap'],
    );

    expect(identifiersOf(found)).toEqual(['G1']);
  });

  it('returns matches in document order, whatever depth they sit at', () => {
    // Shaped after gap-match-example-2, whose gaps live in table cells
    const found = search(
      h => [
        h(GapText, { props: { identifier: 's1' } }, ['Earth']),
        h('table', [
          h('tbody', [
            h('tr', [
              h('td', [h('p', [h(Gap, { props: { identifier: 't1' } })])]),
              h('td', [h('p', [h(Gap, { props: { identifier: 't2' } })])]),
            ]),
            h('tr', [h('td', [h(Gap, { props: { identifier: 't3' } })])]),
          ]),
        ]),
        h('p', ['trailing ', h(Gap, { props: { identifier: 't4' } })]),
      ],
      ['qti-gap'],
    );

    expect(identifiersOf(found)).toEqual(['t1', 't2', 't3', 't4']);
  });

  it('matches any of the tags it is given', () => {
    const found = search(
      h => [
        h(GapText, { props: { identifier: 'W' } }, ['winter']),
        h('p', [h(Gap, { props: { identifier: 'G1' } })]),
      ],
      ['qti-gap-text', 'qti-gap'],
    );

    expect(identifiersOf(found)).toEqual(['W', 'G1']);
  });

  it('leaves content that matches nothing alone', () => {
    const found = search(h => [h('p', ['just a passage'])], ['qti-gap']);

    expect(found).toEqual([]);
  });

  it('does not descend into a match', () => {
    // A gap-text holding a gap is not valid QTI, but it pins the contract: the
    // caller gets the outer element, not something buried inside it.
    const found = search(
      h => [h(GapText, { props: { identifier: 'W' } }, [h(Gap, { props: { identifier: 'G1' } })])],
      ['qti-gap-text', 'qti-gap'],
    );

    expect(identifiersOf(found)).toEqual(['W']);
  });

  it('walks text and empty content without tripping over it', () => {
    const found = search(
      h => ['bare text', h('p', []), h('div', [h(Gap, { props: { identifier: 'G1' } })])],
      ['qti-gap'],
    );

    expect(identifiersOf(found)).toEqual(['G1']);
  });

  it('reads the tags the same way getComponentTag does', () => {
    const found = search(h => [h('p', [h(Gap, { props: { identifier: 'G1' } })])], ['qti-gap']);

    expect(getComponentTag(found[0])).toBe('qti-gap');
  });
});
