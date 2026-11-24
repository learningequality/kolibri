import { h } from 'vue';
import { fireEvent, render, screen, within } from '@testing-library/vue';
import { createSafeHTML } from '../index';

jest.mock('kolibri-plugin-data', () => ({ urls: { __staticUrl: '/static/' } }));

const SafeHTML = createSafeHTML();
const ANSWER_LABEL = 'answer';
const ILLUSTRATION_LABEL = 'illustration';
const FORMULA_LABEL = 'formula';

const Inline = {
  setup() {
    return () => h('span', 'b');
  },
};
const SafeHTMLWithInline = createSafeHTML({
  'x-inline': Inline,
  'x-owner': {
    setup(_, { slots }) {
      return () => {
        const children = slots.default();
        const root = children.some(child => !child.tag && !child.componentOptions) ? 'p' : 'div';
        return h(root, { attrs: { 'data-testid': 'slot-owner' } }, children);
      };
    },
  },
});

describe('SafeHTML whitespace', () => {
  it('preserves the separator after inline SVG', () => {
    render(SafeHTML, {
      props: {
        html: `<p data-testid="inline-text"><svg role="img" aria-label="${ILLUSTRATION_LABEL}"><circle cx="1" cy="1" r="1"></circle></svg> <strong>next</strong></p>`,
      },
    });
    const paragraph = screen.getByTestId('inline-text');
    expect(within(paragraph).getByRole('img', { name: ILLUSTRATION_LABEL })).toBeInTheDocument();
    expect([...paragraph.textContent]).toEqual([...' next']);
  });

  it('drops indentation inside MathML but keeps a nonbreaking space token', () => {
    render(SafeHTML, {
      props: {
        html: `<p><math alttext="${FORMULA_LABEL}"><mrow>\n  <mi>x</mi>\n  <mtext>&nbsp;</mtext>\n  <mo>+</mo>\n</mrow></math></p>`,
      },
    });
    expect([...screen.getByRole('img', { name: FORMULA_LABEL }).textContent]).toEqual([
      'x',
      '\u00a0',
      '+',
    ]);
  });

  it.each([
    '<strong>a</strong> <em>b</em>',
    '<label>a</label> <button>b</button>',
    '<a href="/guide"><strong>a</strong> </a><em>b</em>',
    '<strong>a</strong><a href="/guide"> <em>b</em></a>',
  ])('keeps spaces between phrasing elements in %s', children => {
    render(SafeHTML, {
      props: { html: `<p data-testid="inline-text">${children}</p>` },
    });
    expect([...screen.getByTestId('inline-text').textContent]).toEqual([...'a b']);
  });

  it('keeps every whitespace character between inline elements in preformatted text', () => {
    render(SafeHTML, {
      props: { html: '<pre data-testid="preformatted"><b>a</b>\n\t<i>b</i>\n</pre>' },
    });
    expect([...screen.getByTestId('preformatted').textContent]).toEqual([...'a\n\tb\n']);
  });

  it('drops the whitespace around removed nodes between blocks', () => {
    const { container } = render(SafeHTML, {
      props: {
        html: '<section><p>a</p>\n  <!-- c -->\n  <script>x()</script>\n  <h3>b</h3></section>',
      },
    });
    expect(
      Array.from(container.querySelector('section').childNodes, node => node.nodeName),
    ).toEqual(['P', 'H3']);
  });

  it('keeps an input and its value when nodes before it change shape', async () => {
    const { updateProps } = render(SafeHTML, {
      props: { html: `<div><p>a</p> <input aria-label="${ANSWER_LABEL}"></div>` },
    });
    const input = screen.getByRole('textbox', { name: ANSWER_LABEL });
    input.focus();
    await fireEvent.update(input, '42');

    await updateProps({
      html: `<div><p>a</p><em>b</em><input aria-label="${ANSWER_LABEL}"></div>`,
    });

    const updated = screen.getByRole('textbox', { name: ANSWER_LABEL });
    expect(updated).toBe(input);
    expect(updated).toHaveValue('42');
    expect(updated).toHaveFocus();
  });

  it('keeps spaces between inline components inside HTML', () => {
    render(SafeHTMLWithInline, {
      props: {
        html: '<p data-testid="inline-text">a <x-inline></x-inline> <x-inline></x-inline></p>',
      },
    });
    expect([...screen.getByTestId('inline-text').textContent]).toEqual([...'a b b']);
  });

  it.each([' ', '\n', '&nbsp;'])('keeps sibling paragraphs in a component slot with %s', space => {
    render(SafeHTMLWithInline, {
      props: { html: `<x-owner><p>a</p>${space}<p>b</p></x-owner>` },
    });
    const owner = screen.getByTestId('slot-owner');
    expect(owner.tagName).toBe('DIV');
    expect(Array.from(owner.children, child => [child.tagName, child.textContent])).toEqual([
      ['P', 'a'],
      ['P', 'b'],
    ]);
  });

  it('drops the whitespace in the slot of a component registered for an SVG element', () => {
    const SafeHTMLWithTextPath = createSafeHTML({
      textpath: {
        setup(_, { slots }) {
          return () => h('span', { attrs: { 'data-testid': 'text-path' } }, slots.default());
        },
      },
    });
    render(SafeHTMLWithTextPath, {
      props: {
        html: '<svg><text><textPath><tspan>a</tspan> <tspan>b</tspan></textPath></text></svg>',
      },
    });
    expect(screen.getByTestId('text-path')).toHaveTextContent(/^ab$/, {
      normalizeWhitespace: false,
    });
  });

  it('drops the whitespace between components in a component slot', () => {
    render(SafeHTMLWithInline, {
      props: { html: '<x-owner><x-inline></x-inline>\n  <x-inline></x-inline></x-owner>' },
    });
    const owner = screen.getByTestId('slot-owner');
    expect(owner.tagName).toBe('DIV');
    expect([...owner.textContent]).toEqual([...'bb']);
  });
});
