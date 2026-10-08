import { render } from '@testing-library/vue';
import ColorPicker from '../ColorPicker';

jest.mock('alwan/css', () => {});

// alwan instantiates a canvas-backed color picker on mount, which jsdom does not
// implement. Replace it with a stub that captures the 'change' callback so tests
// can simulate the user picking a color, and records the color it was initialized with.
let mockChangeCallback;
let mockInitColor;
let mockAlwanElement;
jest.mock('alwan', () => ({
  __esModule: true,
  default: class Alwan {
    constructor(el, options) {
      mockInitColor = options.color;
      mockAlwanElement = el;
    }
    on(event, callback) {
      if (event === 'change') {
        mockChangeCallback = callback;
      }
    }
    destroy() {}
  },
}));

describe('ColorPicker', () => {
  it('initializes alwan with the provided color', () => {
    render(ColorPicker, { props: { color: '#abcdef' } });
    expect(mockInitColor).toBe('#abcdef');
  });

  it('emits the picked color as a hex string', () => {
    const { emitted } = render(ColorPicker, { props: { color: '#000000' } });

    // alwan reports the chosen color as an object; the component should emit just
    // the hex string.
    mockChangeCallback({ hex: '#123456', rgb: 'rgb(18, 52, 86)' });

    expect(emitted().change[0][0]).toBe('#123456');
  });

  it('patches alwan accessibility attributes', async () => {
    const { container } = render(ColorPicker, {
      props: { color: '#000000' },
    });

    const pickerRoot = container.firstElementChild;

    const selector = document.createElement('div');
    selector.className = 'alwan__selector';
    selector.setAttribute('aria-label', 'Color picker');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-role', 'none');

    selector.appendChild(svg);
    pickerRoot.appendChild(selector);

    await Promise.resolve();

    expect(selector).toHaveAttribute('role', 'application');
    expect(document.querySelectorAll('svg[aria-role]')).toHaveLength(0);
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
