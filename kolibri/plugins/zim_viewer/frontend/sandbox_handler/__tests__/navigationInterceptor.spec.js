import { attachNavigationInterceptor } from '../navigationInterceptor';

describe('navigationInterceptor', () => {
  let iframeDoc;
  beforeEach(() => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframeDoc = iframe.contentDocument;
    iframeDoc.body.innerHTML = `
      <a id="internal-relative" href="OtherArticle">other</a>
      <a id="parent-relative" href="../C/Other">parent</a>
      <a id="encoded" href="Concei%C3%A7%C3%A3o">accented</a>
      <a id="external" href="https://example.com/">external</a>
      <a id="fragment" href="#section">fragment</a>
      <a id="other-with-fragment" href="OtherArticle#History">other section</a>
      <a id="self-with-fragment" href="Index#section">own section</a>
      <a id="rewritten" href="http://kolibri.local/viewcontent?node_id=abc" data-zim-path="C/Target" data-zim-fragment="Intro">rewritten</a>
      <a id="encoded-fragment" href="#Concei%C3%A7%C3%A3o">encoded section</a>
      <a id="malformed-fragment" href="#100%">malformed section</a>
      <h2 id="section">Section</h2>
      <h2 id="Conceição">Conceição</h2>
      <h2 id="100%">100%</h2>
    `;
    for (const id of ['section', 'Conceição', '100%']) {
      iframeDoc.getElementById(id).scrollIntoView = jest.fn();
    }
  });

  function click(id, options = {}) {
    const ev = new iframeDoc.defaultView.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    iframeDoc.getElementById(id).dispatchEvent(ev);
    return ev;
  }

  it('intercepts internal relative links and dispatches the resolved path', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    const ev = click('internal-relative');
    expect(ev.defaultPrevented).toBe(true);
    expect(onNavigate).toHaveBeenCalledWith('C/OtherArticle', '');
  });

  it('resolves parent-relative links against the article directory', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    click('parent-relative');
    expect(onNavigate).toHaveBeenCalledWith('C/Other', '');
  });

  it('percent-decodes internal links to match decoded ZIM paths', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    click('encoded');
    expect(onNavigate).toHaveBeenCalledWith('C/Conceição', '');
  });

  it('does not intercept absolute http(s) links', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    const ev = click('external');
    expect(ev.defaultPrevented).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('scrolls fragment-only links within the article instead of navigating', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    const ev = click('fragment');
    expect(ev.defaultPrevented).toBe(true);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(iframeDoc.getElementById('section').scrollIntoView).toHaveBeenCalled();
  });

  it('scrolls a link to a section of the current article instead of reloading it', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    click('self-with-fragment');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(iframeDoc.getElementById('section').scrollIntoView).toHaveBeenCalled();
  });

  it('scrolls to a percent-encoded fragment by its decoded id', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    click('encoded-fragment');
    expect(iframeDoc.getElementById('Conceição').scrollIntoView).toHaveBeenCalled();
  });

  it('scrolls to a fragment that is not valid percent-encoding by its literal id', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    click('malformed-fragment');
    expect(iframeDoc.getElementById('100%').scrollIntoView).toHaveBeenCalled();
  });

  it('passes the fragment of a link to another article', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    click('other-with-fragment');
    expect(onNavigate).toHaveBeenCalledWith('C/OtherArticle', 'History');
  });

  it('leaves modifier clicks to the browser, e.g. to open a new tab', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    const ev = click('rewritten', { ctrlKey: true });
    expect(ev.defaultPrevented).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('navigates in-place via data-zim-path even when the href is an absolute permalink', () => {
    const onNavigate = jest.fn();
    attachNavigationInterceptor(iframeDoc, 'C/Index', onNavigate);
    const ev = click('rewritten');
    expect(ev.defaultPrevented).toBe(true);
    expect(onNavigate).toHaveBeenCalledWith('C/Target', 'Intro');
  });
});
