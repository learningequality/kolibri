import { mount } from '@vue/test-utils';
import SubmitBurstAnimation from '../animations/SubmitBurstAnimation.vue';

describe('SubmitBurstAnimation', () => {
  let getElementByIdSpy;

  afterEach(() => {
    if (getElementByIdSpy) {
      getElementByIdSpy.mockRestore();
      getElementByIdSpy = null;
    }
  });

  it('renders the burst SVG', () => {
    const mockPlayer = {
      ready: jest.fn(callback => callback({ play: jest.fn() })),
      destruct: jest.fn(),
    };
    getElementByIdSpy = jest.spyOn(document, 'getElementById').mockReturnValue({
      svgatorPlayer: mockPlayer,
    });

    const wrapper = mount(SubmitBurstAnimation);

    expect(wrapper.find('svg').exists()).toBe(true);

    wrapper.destroy();
  });

  it('calls player.destruct on unmount when available', () => {
    const destruct = jest.fn();
    const mockPlayer = {
      ready: jest.fn(callback => callback({ play: jest.fn() })),
      destruct,
    };
    getElementByIdSpy = jest.spyOn(document, 'getElementById').mockReturnValue({
      svgatorPlayer: mockPlayer,
    });

    const wrapper = mount(SubmitBurstAnimation);

    wrapper.destroy();

    expect(destruct).toHaveBeenCalled();
  });
});
