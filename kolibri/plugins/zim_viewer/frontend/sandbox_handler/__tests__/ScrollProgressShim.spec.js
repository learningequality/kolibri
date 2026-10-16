import { events } from 'kolibri-sandbox/base';
import ScrollProgressShim from '../ScrollProgressShim';

function makeDoc({ scrollHeight, clientHeight }) {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const el = doc.scrollingElement || doc.documentElement;
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
  doc.defaultView.requestAnimationFrame = callback => {
    callback();
    return 1;
  };
  return { doc, el };
}

function scrollTo(doc, el, scrollTop) {
  el.scrollTop = scrollTop;
  doc.defaultView.dispatchEvent(new Event('scroll'));
}

describe('ScrollProgressShim', () => {
  let mediator;
  let shim;
  beforeEach(() => {
    mediator = { sendMessage: jest.fn() };
    shim = new ScrollProgressShim(mediator);
  });

  const reported = () =>
    mediator.sendMessage.mock.calls
      .map(([message]) => message)
      .filter(message => message.event === events.SHIMSTATEUPDATE)
      .map(message => message.data.progress);

  it('reports nothing before an article is tracked', () => {
    expect(shim.getProgress()).toBeNull();
  });

  it('completes an article that fits without scrolling', () => {
    const { doc } = makeDoc({ scrollHeight: 500, clientHeight: 500 });
    shim.track(doc);
    expect(reported()).toEqual([1]);
  });

  it('reports the furthest point scrolled to', () => {
    const { doc, el } = makeDoc({ scrollHeight: 1100, clientHeight: 100 });
    shim.track(doc);
    scrollTo(doc, el, 500);
    scrollTo(doc, el, 200);
    expect(shim.getProgress()).toBe(0.5);
    expect(reported()).toEqual([0.5]);
  });

  it('completes on reaching the bottom', () => {
    const { doc, el } = makeDoc({ scrollHeight: 1100, clientHeight: 100 });
    shim.track(doc);
    scrollTo(doc, el, 999.5);
    expect(shim.getProgress()).toBe(1);
  });

  it('reports nothing while suspended, and ignores scrolling meanwhile', () => {
    const { doc, el } = makeDoc({ scrollHeight: 1100, clientHeight: 100 });
    shim.track(doc);
    scrollTo(doc, el, 500);
    shim.suspend();
    scrollTo(doc, el, 1000);
    expect(shim.getProgress()).toBeNull();
    expect(reported()).toEqual([0.5]);
  });

  it('resumes from the furthest point without measuring the article again', () => {
    const { doc, el } = makeDoc({ scrollHeight: 1100, clientHeight: 100 });
    shim.track(doc);
    scrollTo(doc, el, 500);
    shim.suspend();
    Object.defineProperty(el, 'scrollHeight', { value: 100, configurable: true });
    shim.resume();
    expect(shim.getProgress()).toBe(0.5);
    expect(reported()).toEqual([0.5]);
  });

  it('starts from zero, and stops listening to the old article, when tracking a new one', () => {
    const first = makeDoc({ scrollHeight: 1100, clientHeight: 100 });
    shim.track(first.doc);
    scrollTo(first.doc, first.el, 500);
    const second = makeDoc({ scrollHeight: 1100, clientHeight: 100 });
    shim.track(second.doc);
    scrollTo(first.doc, first.el, 1000);
    expect(shim.getProgress()).toBe(0);
  });
});
