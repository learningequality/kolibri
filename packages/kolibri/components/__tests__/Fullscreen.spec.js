import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ScreenFull from 'screenfull';
import Fullscreen from '../Fullscreen';

jest.mock('screenfull', () => ({
  isEnabled: true,
  isFullscreen: false,
  toggle: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  off: jest.fn(),
}));

const Host = {
  components: { Fullscreen },
  template: `
    <Fullscreen ref="fullscreen">
      <button @click="$refs.fullscreen.toggleFullscreen()">toggle</button>
    </Fullscreen>
  `,
};

describe('Fullscreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can be toggled again after the browser refuses fullscreen', async () => {
    // requestFullscreen rejects without a user gesture; the button must not go dead.
    ScreenFull.toggle.mockRejectedValueOnce(new Error('not allowed'));
    render(Host);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('button'));

    expect(ScreenFull.toggle).toHaveBeenCalledTimes(2);
  });

  it('stops listening for fullscreen changes when destroyed', () => {
    const { unmount } = render(Host);
    const [[event, handler]] = ScreenFull.on.mock.calls;

    unmount();

    expect(ScreenFull.off).toHaveBeenCalledWith(event, handler);
  });
});
