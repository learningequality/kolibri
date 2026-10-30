import { render, screen, fireEvent } from '@testing-library/vue';
import { crossComponentTranslator } from 'kolibri/utils/i18n';
import SkipNavigationLink from '../SkipNavigationLink.vue';

const { skipToMainContentAction$ } = crossComponentTranslator(SkipNavigationLink);

function renderWithMain(mainHtml) {
  if (mainHtml !== null) {
    const main = document.createElement('div');
    main.id = 'main';
    main.innerHTML = mainHtml;
    document.body.appendChild(main);
  }
  return render(SkipNavigationLink);
}

function getSkipLink() {
  return screen.getByText(skipToMainContentAction$()).closest('a');
}

async function clickSkipLink() {
  await fireEvent.click(getSkipLink());
}

describe('SkipNavigationLink', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the [data-skip-nav-target] override when present, ahead of an h1', async () => {
    renderWithMain('<div data-skip-nav-target>target</div><h1>heading</h1>');
    await clickSkipLink();
    expect(document.querySelector('[data-skip-nav-target]')).toHaveFocus();
  });

  it('falls back to the first h1 when there is no override target', async () => {
    renderWithMain('<h1>heading</h1>');
    await clickSkipLink();
    expect(document.querySelector('h1')).toHaveFocus();
  });

  it('falls back to the first h2 when there is no h1', async () => {
    renderWithMain('<h2>heading</h2>');
    await clickSkipLink();
    expect(document.querySelector('h2')).toHaveFocus();
  });

  it('prefers h1 over h2 when both are present', async () => {
    renderWithMain('<h2>subheading</h2><h1>heading</h1>');
    await clickSkipLink();
    expect(document.querySelector('h1')).toHaveFocus();
  });

  it('falls back to a nested main/[role="main"] landmark when there is no h1 or h2', async () => {
    renderWithMain('<main>content</main>');
    await clickSkipLink();
    expect(document.querySelector('main')).toHaveFocus();
  });

  it('falls back to #main itself when nothing else matches', async () => {
    renderWithMain('<p>content</p>');
    await clickSkipLink();
    expect(document.getElementById('main')).toHaveFocus();
  });

  it('sets tabindex="-1" on the focus target so it is programmatically focusable', async () => {
    renderWithMain('<h1>heading</h1>');
    await clickSkipLink();
    expect(document.querySelector('h1')).toHaveAttribute('tabindex', '-1');
  });

  it('does not override tabindex on an override target that is already focusable', async () => {
    renderWithMain('<input data-skip-nav-target>');
    await clickSkipLink();
    const input = document.querySelector('input');
    expect(input).toHaveFocus();
    expect(input).not.toHaveAttribute('tabindex');
  });

  it('falls back to a heading elsewhere in the document when #main is missing', async () => {
    renderWithMain(null);
    const heading = document.createElement('h1');
    heading.textContent = 'real content';
    document.body.appendChild(heading);
    await clickSkipLink();
    expect(heading).toHaveFocus();
  });

  it('prefers a [data-skip-nav-target] override even when it comes after an h1 in that fallback', async () => {
    renderWithMain(null);
    const heading = document.createElement('h1');
    heading.textContent = 'heading before the override in the DOM';
    document.body.appendChild(heading);
    const override = document.createElement('div');
    override.setAttribute('data-skip-nav-target', '');
    override.textContent = 'override target';
    document.body.appendChild(override);
    await clickSkipLink();
    expect(override).toHaveFocus();
  });

  it('prefers h1 over h2 in that fallback even when the h2 comes first in the DOM', async () => {
    renderWithMain(null);
    const subheading = document.createElement('h2');
    subheading.textContent = 'subheading before the h1 in the DOM';
    document.body.appendChild(subheading);
    const heading = document.createElement('h1');
    heading.textContent = 'heading';
    document.body.appendChild(heading);
    await clickSkipLink();
    expect(heading).toHaveFocus();
  });

  it('excludes headings inside <nav> or <header> from that fallback', async () => {
    renderWithMain(null);
    const nav = document.createElement('nav');
    nav.innerHTML = '<h1>nav heading</h1>';
    document.body.appendChild(nav);
    const header = document.createElement('header');
    header.innerHTML = '<h1>header heading</h1>';
    document.body.appendChild(header);
    const content = document.createElement('h1');
    content.textContent = 'real content';
    document.body.appendChild(content);
    await clickSkipLink();
    expect(content).toHaveFocus();
  });

  it('keeps focus on the skip link when there is no #main and nothing to fall back to', async () => {
    renderWithMain(null);
    const link = getSkipLink();
    await fireEvent.click(link);
    expect(link).toHaveFocus();
  });

  it('keeps focus on the skip link when only nav/header content is available', async () => {
    renderWithMain(null);
    const nav = document.createElement('nav');
    nav.innerHTML = '<h1>nav heading</h1>';
    document.body.appendChild(nav);
    const link = getSkipLink();
    await fireEvent.click(link);
    expect(link).toHaveFocus();
  });
});
