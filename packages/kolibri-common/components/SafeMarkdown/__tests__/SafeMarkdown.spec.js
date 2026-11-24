import { render, screen, waitFor, within } from '@testing-library/vue';
import SafeMarkdown from '../index';

jest.mock('kolibri', () => ({
  canHandleElement: jest.fn(),
  objectViewerMimetypes: jest.fn(() => []),
}));
jest.mock('kolibri/urls');
jest.mock('@vueuse/core', () => ({
  ...jest.requireActual('@vueuse/core'),
  useResizeObserver: jest.fn(),
  useEventListener: jest.fn(),
}));

describe('SafeMarkdown', () => {
  beforeEach(() => {
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 77, height: 23 });
  });

  afterEach(() => jest.restoreAllMocks());

  async function settleTex() {
    await import('../tex');
    await global.flushPromises();
  }

  it('preserves whitespace-only code', () => {
    const { container } = render(SafeMarkdown, { props: { text: '```\n   \n```' } });
    expect([...container.querySelector('code').textContent]).toEqual([...'   \n']);
  });

  it('keeps currency ranges literal', () => {
    const { container } = render(SafeMarkdown, { props: { text: '$3-$4' } });
    expect(container).toHaveTextContent('$3-$4');
  });

  it('keeps formulas in image descriptions', () => {
    const description = 'literal $x$';
    render(SafeMarkdown, { props: { text: `![${description}](/image)` } });
    expect(screen.getByRole('img', { name: description })).toBeInTheDocument();
  });

  it('keeps prose after a malformed display opener', async () => {
    const { container } = render(SafeMarkdown, {
      props: { text: '\\[\n\n**Next**\n\n\\[x\\]' },
    });
    expect(await screen.findByRole('math', { hidden: true })).toHaveTextContent('x');
    expect(container.querySelector('strong')).toHaveTextContent('Next');
  });

  it('renders a display formula containing a line that is not a valid code fence', async () => {
    render(SafeMarkdown, { props: { text: '$$\n\\text{Thrice\n```literal`\nand again}\n$$' } });
    const math = await screen.findByRole('math', { hidden: true });
    expect(math.attributes.display.value).toBe('block');
    expect(math).toHaveTextContent(/^Thrice\s*\S+literal\S\s*and again$/);
  });

  it('keeps an unclosed display opener from consuming a code fence', () => {
    const { container } = render(SafeMarkdown, { props: { text: '\\[\n\n```\nx\\]\n```' } });
    expect(container.querySelector('pre > code')).toHaveTextContent('x\\]');
  });

  it.each([
    ['$$', '$$'],
    ['\\[', '\\]'],
  ])('keeps a heading after %s closed by a nonbreaking space', (open, close) => {
    render(SafeMarkdown, { props: { text: `${open}\nx\n${close}\u00a0\n\n## Next` } });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Next');
  });

  it('keeps an unclosed display opener from consuming a quoted code fence', () => {
    const { container } = render(SafeMarkdown, {
      props: { text: ['\\[', '> ```', '> x\\]', '> ```'].join('\n') },
    });
    expect(container.querySelector('blockquote pre > code')).toHaveTextContent('x\\]');
  });

  it('keeps an unclosed display opener from consuming an indented quoted code fence', () => {
    const { container } = render(SafeMarkdown, {
      props: { text: ['\\[', '>  ~~~', '>  x\\]', '>  ~~~'].join('\n') },
    });
    expect(container.querySelector('blockquote pre > code')).toHaveTextContent('x\\]');
  });

  it('keeps the source when the opening line contains an early display closer', async () => {
    const headingText = 'Next';
    render(SafeMarkdown, {
      props: { text: `$$x % $$ inside a comment\n+y$$\n\n## ${headingText}` },
    });
    await settleTex();
    expect(screen.queryByRole('math', { hidden: true })).not.toBeInTheDocument();
    const heading = screen.getByRole('heading', { name: headingText, level: 2 });
    expect(heading.previousElementSibling).toHaveTextContent(
      /^\$\$x % \$\$ inside a comment \+y\$\$$/,
    );
  });

  it('keeps a dollar formula with an escaped closer as text', async () => {
    const { container } = render(SafeMarkdown, { props: { text: '$x+\\$y$ and \\(z\\)' } });
    expect(await screen.findByRole('math', { hidden: true })).toHaveTextContent('z');
    expect(container).toHaveTextContent('$x+$y$ and z');
  });

  it('preserves newlines after TeX comments', async () => {
    render(SafeMarkdown, { props: { text: '$$x % comment\n+y$$' } });
    expect(await screen.findByRole('math', { hidden: true })).toHaveTextContent(/x\s*\+\s*y/);
  });

  it('renders surrounding Markdown when a formula throws', async () => {
    const { container, updateProps } = render(SafeMarkdown, { props: { text: 'Good $x$' } });
    await screen.findByRole('math', { hidden: true });
    await updateProps({ text: 'Before $\\unicode{x110000}$ after\n\n**Next**' });
    expect(container).toHaveTextContent('Before \\unicode{x110000} after');
    expect(container.querySelector('strong')).toHaveTextContent('Next');
  });

  it('renders a left-to-right formula in an authored right-to-left paragraph', async () => {
    const { container } = render(SafeMarkdown, { props: { text: 'مرحبا $x$ نهاية' } });
    const math = await screen.findByRole('math', { hidden: true });
    expect(container.firstElementChild).toHaveAttribute('dir', 'auto');
    expect(math.parentElement.closest('[dir]')).toBe(container.firstElementChild);
    expect(math.attributes.dir.value).toBe('ltr');
  });

  it('resets equation labels between renders', async () => {
    const { updateProps } = render(SafeMarkdown, {
      props: { text: '$$x+1\\tag{1}\\label{answer}$$' },
    });
    await screen.findByRole('math', { hidden: true });
    await updateProps({ text: '$$y+1\\tag{1}\\label{answer}$$' });
    await waitFor(() =>
      expect(screen.getByRole('math', { hidden: true })).toHaveTextContent(/^\(1\)y\s*\+\s*1$/),
    );
    const math = screen.getByRole('math', { hidden: true });
    expect(math.querySelector('[id]')).not.toBeNull();
    expect(math.querySelector('merror')).toBeNull();
  });

  it('renders plain text', () => {
    const { container } = render(SafeMarkdown, { props: { text: 'Plain text' } });
    expect(container).toHaveTextContent('Plain text');
  });

  it('renders Markdown headings', () => {
    render(SafeMarkdown, { props: { text: '## Heading' } });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Heading');
  });

  it.each(['$x$', '$$x$$', '\\(x\\)', '\\( x \\)', '$$\nx\n$$'])(
    'renders %s as left-to-right MathML',
    async text => {
      render(SafeMarkdown, { props: { text } });
      const math = await screen.findByRole('math', { hidden: true });
      expect(math.attributes.dir.value).toBe('ltr');
      expect(math.closest('[aria-hidden="true"]')).toBeNull();
    },
  );

  it.each(['\\[x\\]', '\\[\nx\n\\]'])('renders standalone %s outside a paragraph', async text => {
    render(SafeMarkdown, { props: { text } });
    const math = await screen.findByRole('math', { hidden: true });
    expect(math.closest('p')).toBeNull();
    expect(math.attributes.dir.value).toBe('ltr');
    expect(math.closest('[aria-hidden="true"]')).toBeNull();
  });

  it.each([
    ['$x$', 'inline'],
    ['$$x$$', 'block'],
    ['\\(x\\)', 'inline'],
    ['\\[x\\]', 'block'],
  ])('renders %s mid-sentence as %s math', async (formula, display) => {
    render(SafeMarkdown, { props: { text: `Before ${formula} after` } });
    const math = await screen.findByRole('math', { hidden: true });
    expect(math).toHaveTextContent('x');
    expect(math.getAttribute('display') || 'inline').toBe(display);
    expect(math.closest('p')).toHaveTextContent(/^Before\s+x\s+after$/);
  });

  it.each(['$unclosed', '$3 and $4', '$20,000', '**unclosed'])('preserves %s', text => {
    const { container } = render(SafeMarkdown, { props: { text } });
    expect(container).toHaveTextContent(text);
  });

  it('escapes raw HTML', () => {
    const { container } = render(SafeMarkdown, { props: { text: '<b>Raw</b>' } });
    expect(container).toHaveTextContent('<b>Raw</b>');
    expect(container.querySelector('b')).toBeNull();
  });

  it('preserves formula source inside code', () => {
    const { container } = render(SafeMarkdown, { props: { text: '`$x$`' } });
    expect(container.querySelector('code')).toHaveTextContent('$x$');
  });

  it('keeps spaces between formatted words', () => {
    const { container } = render(SafeMarkdown, { props: { text: '**a** *b*' } });
    expect(container.querySelector('p > strong')).toHaveTextContent(/^a$/);
    expect(container.querySelector('p > em')).toHaveTextContent(/^b$/);
    expect(container.textContent.trim()).toBe('a b');
  });

  it.each(['$$x$$ where x is', '$$'])('keeps paragraphs after %s', opening => {
    const { container } = render(SafeMarkdown, { props: { text: `${opening}\n\nNext **b**` } });
    expect(container.querySelector('strong')).toHaveTextContent('b');
  });

  it.each(['$$x$$ and $$y$$', '\\[x\\] and \\[y\\]'])(
    'keeps prose between display formulas in %s',
    async text => {
      const { container } = render(SafeMarkdown, { props: { text } });
      expect(await screen.findAllByRole('math', { hidden: true })).toHaveLength(2);
      expect(container).toHaveTextContent('x and y');
    },
  );

  it.each([
    ['$$', '$$'],
    ['\\[', '\\]'],
  ])('keeps a heading before a later inline formula after %s', async (open, close) => {
    render(SafeMarkdown, {
      props: { text: `${open}\nx\n\n## Next\n\nNow **solve** ${open}y${close}` },
    });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Next');
    expect(await screen.findByRole('math', { hidden: true })).toHaveTextContent('y');
  });

  it.each(['\t', '    '])(
    'keeps an indented code line ending in a display delimiter indented with %j',
    indentation => {
      const { container } = render(SafeMarkdown, {
        props: { text: `$$\nx\n\n${indentation}y$$\n\n## Next\n\n$$` },
      });
      expect(container.querySelector('pre code')).toHaveTextContent('y$$');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Next');
    },
  );

  it('keeps a display delimiter inside a code fence in a list item', () => {
    const { container } = render(SafeMarkdown, {
      props: { text: '$$\n\n- Example\n    ```text\n  $$\n    ```\n\n## Next' },
    });
    expect(screen.getByRole('listitem')).toHaveTextContent(/^Example\s*\$\$$/);
    expect(container.querySelector('li pre > code')).toHaveTextContent('$$');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Next');
  });

  it('keeps a code fence in a tab-indented list item inside an unclosed display opener', async () => {
    const { container } = render(SafeMarkdown, {
      props: { text: '$$\n\n-\tExample\n\n    ~~~\n    code\n    ~~~\n\nx$$' },
    });
    await settleTex();
    expect(screen.queryByRole('math', { hidden: true })).not.toBeInTheDocument();
    expect(container.querySelector('li pre > code')).toHaveTextContent(/^code$/);
  });

  it('renders a display formula over an indented-code line that looks like a fence', async () => {
    render(SafeMarkdown, { props: { text: '$$\nx\n-     ~~~\ny\n$$' } });
    const math = await screen.findByRole('math', { hidden: true });
    expect(math.attributes.display.value).toBe('block');
    expect(math).toHaveTextContent(/^x−\s*y$/);
  });

  it('keeps a list item whose continuation is a four-column-indented display delimiter', async () => {
    render(SafeMarkdown, { props: { text: '$$\n- x\n    $$' } });
    await settleTex();
    expect(screen.queryByRole('math', { hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent(/^x \$\$$/);
  });

  it('keeps color definitions within a render', async () => {
    const { container, updateProps } = render(SafeMarkdown, {
      props: { text: String.raw`$\definecolor{red}{RGB}{0,128,0}x$ $\color{red}{y}$` },
    });
    expect(await screen.findAllByRole('math', { hidden: true })).toHaveLength(2);
    expect(container.querySelector('[mathcolor]').attributes.mathcolor.value).toBe('#008000');
    await updateProps({ text: String.raw`$\color{red}{x}$` });
    expect(container.querySelector('[mathcolor]').attributes.mathcolor.value).toBe('red');
  });

  it('links each equation reference to its own component', async () => {
    const text = String.raw`$$x+1\tag{1}\label{answer}$$ and $\eqref{answer}$`;
    const first = render(SafeMarkdown, { props: { text } });
    const second = render(SafeMarkdown, { props: { text } });
    expect(await screen.findAllByRole('math', { hidden: true })).toHaveLength(4);
    const equationIds = [first, second].map(({ container }) => {
      const equation = container.querySelector('math [id]');
      const href = container.querySelector('math [href]').getAttribute('href');
      expect(decodeURIComponent(href)).toBe('#' + equation.id);
      return equation.id;
    });
    expect(new Set(equationIds).size).toBe(2);
  });

  it('isolates the direction of failed TeX', async () => {
    const { container } = render(SafeMarkdown, {
      props: { text: String.raw`$x$ $\unicode{x110000}$ مرحبا` },
    });
    await screen.findByRole('math', { hidden: true });
    const source = container.querySelector('p > span[dir]');
    expect(source).toHaveTextContent(String.raw`\unicode{x110000}`);
    expect(source).toHaveAttribute('dir', 'ltr');
  });

  it('resets tag forms between renders', async () => {
    const { updateProps } = render(SafeMarkdown, {
      props: { text: String.raw`$$\newtagform{b}{[}{]}\usetagform{b}x\tag{1}$$` },
    });
    expect(await screen.findByRole('math', { hidden: true })).toHaveTextContent('[1]');
    await updateProps({ text: String.raw`$$\newtagform{b}{[}{]}y\tag{1}$$` });
    const math = screen.getByRole('math', { hidden: true });
    expect(math).toHaveTextContent('(1)');
    expect(math.querySelector('merror')).toBeNull();
  });

  it('renders display math after an uninterrupted paragraph', async () => {
    render(SafeMarkdown, { props: { text: 'Text:\n$$\nx\n$$' } });
    const math = await screen.findByRole('math', { hidden: true });
    expect(math.attributes.display.value).toBe('block');
    expect(math.previousElementSibling).toHaveTextContent('Text:');
  });

  it.each(['', ' ', '  '])('renders display math between lists with indent %j', async indent => {
    render(SafeMarkdown, {
      props: { text: `1. Compute the area:\n${indent}$$\nA = \\pi r^2\n$$\n2. Then simplify.` },
    });
    const math = await screen.findByRole('math', { hidden: true });
    expect(math.attributes.display.value).toBe('block');
    expect(math.closest('li')).toBeNull();
    expect(within(math.previousElementSibling).getByRole('listitem')).toHaveTextContent(
      /^Compute the area:$/,
    );
    expect(within(math.nextElementSibling).getByRole('listitem')).toHaveTextContent(
      /^Then simplify\.$/,
    );
    expect(math.nextElementSibling).toHaveAttribute('start', '2');
  });

  it('renders display math after a nested list within the outer list item', async () => {
    const text = '1. Outer item\n   - Inner item\n    $$\n   x\n   $$\n2. Next item';
    render(SafeMarkdown, { props: { text } });

    const math = await screen.findByRole('math', { hidden: true });
    expect(math.closest('li')).toBe(screen.getAllByRole('listitem')[0]);
    expect(within(math.previousElementSibling).getByRole('listitem')).toHaveTextContent(
      /^Inner item$/,
    );
  });

  it('renders outdented display math outside both enclosing lists', async () => {
    const text = '1. Outer\n   - Inner\n  $$\nx\n$$\n2. Next';
    render(SafeMarkdown, { props: { text } });

    const math = await screen.findByRole('math', { hidden: true });
    const display = math.getAttribute('display');
    expect(display).toBe('block');
    expect(math).toHaveTextContent(/^x$/);
    expect(math.closest('li')).toBeNull();
    const nextList = screen.getAllByRole('list').at(-1);
    expect(math.nextElementSibling).toBe(nextList);
    expect(nextList).toHaveAttribute('start', '2');
  });

  it('keeps the next list item when an outdented math closer is indented code', async () => {
    const text = '1. Outer\n   - Inner\n $$\n x\n    $$\n2. Next';
    render(SafeMarkdown, { props: { text } });
    await settleTex();

    expect(screen.queryByRole('math', { hidden: true })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').at(-1)).toHaveTextContent(/^Next$/);
  });

  it('keeps a four-space-indented display opener in a lazy blockquote continuation', async () => {
    const text = '> Quote\n    $$\nx\n$$';
    const { container } = render(SafeMarkdown, { props: { text } });
    await settleTex();

    expect(screen.queryByRole('math', { hidden: true })).not.toBeInTheDocument();
    expect(container.querySelector('pre')).not.toBeInTheDocument();
    expect(container.querySelector('blockquote > p')).toHaveTextContent(/^Quote \$\$ x \$\$$/);
  });

  it('parses Markdown punctuation inside math as TeX', async () => {
    const { container } = render(SafeMarkdown, { props: { text: '$x_1*y_2$' } });
    expect(await screen.findByRole('math', { hidden: true })).toHaveTextContent(
      /x\s*1\s*∗\s*y\s*2/,
    );
    expect(container.querySelector('em, strong')).toBeNull();
  });

  it.each([
    ['$\\unknown$', '\\unknown'],
    ['$\\frac{1}{$', '\\frac{1}{'],
  ])('renders %s alongside the next paragraph', async (formula, expected) => {
    const { container } = render(SafeMarkdown, { props: { text: `${formula}\n\n**Next**` } });
    expect(await screen.findByRole('math', { hidden: true })).toHaveTextContent(expected);
    expect(container.querySelector('strong')).toHaveTextContent('Next');
  });

  it('renders a chemical formula with a subscript', async () => {
    render(SafeMarkdown, { props: { text: '$\\ce{H2O}$' } });
    const math = await screen.findByRole('math', { hidden: true });
    const visibleTokens = Array.from(math.querySelectorAll('mi, mn, mo, mtext')).filter(
      token => !token.closest('mphantom'),
    );
    expect(visibleTokens.map(token => token.textContent)).toEqual(['H', '2', 'O']);
    expect(math.querySelector('msub').children[1]).toHaveTextContent(/^2$/);
  });

  it('keeps an empty prescript slot', async () => {
    render(SafeMarkdown, { props: { text: '$\\prescript{14}{}{C}$' } });
    const math = await screen.findByRole('math', { hidden: true });
    const [base, prescripts, presubscript, presuperscript] =
      math.querySelector('mmultiscripts').children;
    expect(base).toHaveTextContent('C');
    expect(prescripts.tagName.toLowerCase()).toBe('mprescripts');
    expect(presubscript).toHaveTextContent('');
    expect([presuperscript.tagName.toLowerCase(), presuperscript.textContent]).toEqual([
      'mn',
      '14',
    ]);
  });

  it('keeps MathML spacing', async () => {
    render(SafeMarkdown, { props: { text: '$a~b\\quad c$' } });
    const math = await screen.findByRole('math', { hidden: true });
    expect([...math.querySelector('mtext').textContent]).toEqual(['\u00a0']);
    const spaceWidth = math.querySelector('mspace').getAttribute('width');
    expect(spaceWidth).toBe('1em');
  });

  it('keeps a space between formulas', async () => {
    const { container } = render(SafeMarkdown, { props: { text: '$x$ $y$' } });
    expect(await screen.findAllByRole('math', { hidden: true })).toHaveLength(2);
    expect(container.textContent.trim()).toBe('x y');
  });

  it('does not render JavaScript links from TeX', async () => {
    render(SafeMarkdown, { props: { text: '$\\href{javascript:void(0)}{x}$' } });
    const math = await screen.findByRole('math', { hidden: true });
    expect(math).toHaveTextContent(String.raw`\href`);
    expect(math.querySelector('[href^="javascript:"]')).toBeNull();
  });

  it('drops a JavaScript href from MathML tokens generated from TeX', async () => {
    const text = String.raw`$\mmlToken{mi}[href="javascript:void(0)"]{x}$`;
    render(SafeMarkdown, { props: { text } });

    const math = await screen.findByRole('math', { hidden: true });
    const identifier = math.querySelector('mi');
    expect(identifier).toHaveTextContent(/^x$/);
    const href = identifier.getAttribute('href');
    expect(href).toBeNull();
  });
});
