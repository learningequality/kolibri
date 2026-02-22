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
});
