import { render, screen, fireEvent } from '@testing-library/vue';
import BottomBar from '../BottomBar';

function renderBottomBar(props = {}) {
  return render(BottomBar, {
    props: {
      sliderValue: 0,
      sliderStep: 1,
      locationsAreReady: true,
      ...props,
    },
  });
}

describe('Bottom bar', () => {
  it('should not display a heading if none is provided', () => {
    renderBottomBar();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
  it('should display a heading if one is provided', () => {
    const heading = 'Chapter 1';
    renderBottomBar({ heading });
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
  it('should not display slider if locations are not ready', () => {
    renderBottomBar({ locationsAreReady: false });
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
  it('should display slider if locations are ready', () => {
    renderBottomBar();
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });
  it('should set the correct value on the slider', () => {
    const sliderValue = 100;
    renderBottomBar({ sliderValue });
    expect(screen.getByRole('slider')).toHaveValue('100');
  });
  it.each([
    [23, '23%'],
    [100, '100%'],
  ])('should describe a slider value of %s as %s', (sliderValue, valueText) => {
    renderBottomBar({ sliderValue });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', valueText);
  });
  it('should set the correct step on the slider', () => {
    const sliderStep = 10;
    renderBottomBar({ sliderStep });
    expect(screen.getByRole('slider')).toHaveAttribute('step', String(sliderStep));
  });
  it("should emit an event when the slider's value is changed", async () => {
    const newValue = '50';
    const { emitted } = renderBottomBar();
    const slider = screen.getByRole('slider');
    slider.value = newValue;
    await fireEvent.change(slider);
    expect(emitted().sliderChanged[0][0]).toBe(Number(newValue));
  });
  describe('after a slider change', () => {
    // Rendered through a parent, as in EpubRendererIndex, so that a new
    // relocationCount reaches BottomBar as a prop update without forcing a re-render
    const SliderParent = {
      components: { BottomBar },
      props: ['sliderValue', 'relocationCount'],
      render(h) {
        return h(BottomBar, {
          props: {
            sliderValue: this.sliderValue,
            relocationCount: this.relocationCount,
            sliderStep: 1,
            locationsAreReady: true,
          },
        });
      },
    };

    async function renderAndChangeSlider() {
      const { updateProps } = render(SliderParent, {
        props: { sliderValue: 1, relocationCount: 0 },
      });
      const slider = screen.getByRole('slider');
      slider.value = '2';
      await fireEvent.change(slider);
      return { slider, updateProps };
    }

    it('should keep the changed value until the relocation settles', async () => {
      const { slider } = await renderAndChangeSlider();
      expect(slider).toHaveValue('2');
      expect(slider).toHaveAttribute('aria-valuetext', '1%');
    });
    it('should reset to sliderValue when the relocation does not move the book', async () => {
      const { slider, updateProps } = await renderAndChangeSlider();
      await updateProps({ relocationCount: 1 });
      expect(slider).toHaveValue('1');
      expect(slider).toHaveAttribute('aria-valuetext', '1%');
    });
    it('should move to the new sliderValue when the relocation moves the book', async () => {
      const { slider, updateProps } = await renderAndChangeSlider();
      await updateProps({ sliderValue: 3, relocationCount: 1 });
      expect(slider).toHaveValue('3');
      expect(slider).toHaveAttribute('aria-valuetext', '3%');
    });
  });
});
