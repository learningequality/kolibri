import { virtualNodeId } from 'kolibri/utils/virtualNodeId';
import { attachLinkRewriter } from '../linkRewriter';

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

const ROOT_ID = '0011223344556677889900aabbccddee';
const PERMALINK_BASE = 'http://kolibri.local/viewcontent';

describe('linkRewriter', () => {
  let iframeDoc;
  beforeEach(() => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframeDoc = iframe.contentDocument;
    iframeDoc.body.innerHTML = `
      <a id="internal" href="OtherArticle">other</a>
      <a id="section" href="OtherArticle#History">other section</a>
      <a id="external" href="https://example.com/">external</a>
    `;
  });

  function hover(el) {
    el.dispatchEvent(new iframeDoc.defaultView.MouseEvent('mouseover', { bubbles: true }));
  }

  function attach(resolve = () => Promise.resolve({})) {
    return attachLinkRewriter(iframeDoc, 'C/Index', {
      rootId: ROOT_ID,
      permalinkBase: PERMALINK_BASE,
      resolve,
    });
  }

  it('permalinks a link to a redirect by the page it redirects to', async () => {
    const resolve = jest.fn(() => Promise.resolve({ 'C/OtherArticle': { path: 'C/Target' } }));
    attach(resolve);
    await flushPromises();
    const link = iframeDoc.getElementById('internal');

    hover(link);

    expect(resolve).toHaveBeenCalledWith(['C/OtherArticle']);
    expect(link.dataset.zimPath).toBe('C/Target');
    expect(link).toHaveAttribute(
      'href',
      `${PERMALINK_BASE}?node_id=${virtualNodeId(ROOT_ID, 'C/Target')}`,
    );
  });

  it('re-points a link hovered before its redirect was resolved', async () => {
    let answer;
    attach(() => new Promise(resolve => (answer = resolve)));
    const link = iframeDoc.getElementById('internal');
    hover(link);

    answer({ 'C/OtherArticle': { path: 'C/Target' } });
    await flushPromises();
    hover(link);

    expect(link).toHaveAttribute(
      'href',
      `${PERMALINK_BASE}?node_id=${virtualNodeId(ROOT_ID, 'C/Target')}`,
    );
  });

  it('rewrites an internal link to its permalink and stashes the canonical path', () => {
    attach();
    const link = iframeDoc.getElementById('internal');

    hover(link);

    expect(link.dataset.zimPath).toBe('C/OtherArticle');
    expect(link).toHaveAttribute(
      'href',
      `${PERMALINK_BASE}?node_id=${virtualNodeId(ROOT_ID, 'C/OtherArticle')}`,
    );
  });

  it("keeps a link's fragment for the in-place click to scroll to", () => {
    attach();
    const link = iframeDoc.getElementById('section');

    hover(link);

    expect(link.dataset.zimPath).toBe('C/OtherArticle');
    expect(link.dataset.zimFragment).toBe('History');
  });

  it('leaves external links untouched', () => {
    attach();
    const link = iframeDoc.getElementById('external');

    hover(link);

    expect(link).toHaveAttribute('href', 'https://example.com/');
    expect(link.dataset.zimPath).toBeUndefined();
  });
});
