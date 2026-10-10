import { render, screen } from '@testing-library/vue';
import UnsupportedInteraction from '../UnsupportedInteraction.vue';

describe('UnsupportedInteraction', () => {
  it('renders the unsupported title and message', () => {
    render(UnsupportedInteraction, {
      props: { originalTag: 'qti-hotspot-interaction' },
    });
    expect(screen.getByText('Unsupported Question Type')).toBeInTheDocument();
    expect(screen.getByText(
      'This question contains an interaction type that cannot be displayed in the current viewer. Please contact your content administrator.'
    )).toBeInTheDocument();
    expect(screen.getByText('Unsupported interaction: Hotspot')).toBeInTheDocument();
  });

  it('formats the interaction type from the original tag', () => {
    // Test each interaction type with a separate render
    const testCases = [
      { originalTag: 'qti-extended-text-interaction', expected: 'Extended Text' },
      { originalTag: 'qti-graphic-gap-match-interaction', expected: 'Graphic Gap Match' },
      { originalTag: 'qti-hottext-interaction', expected: 'Hottext' },
      { originalTag: 'qti-media-interaction', expected: 'Media' },
      { originalTag: 'qti-select-point-interaction', expected: 'Select Point' },
      { originalTag: 'qti-slider-interaction', expected: 'Slider' },
      { originalTag: 'qti-upload-interaction', expected: 'Upload' },
      { originalTag: 'qti-drawing-interaction', expected: 'Drawing' },
    ];

    for (const { originalTag, expected } of testCases) {
      const { unmount } = render(UnsupportedInteraction, {
        props: { originalTag },
      });
      expect(screen.getByText(`Unsupported interaction: ${expected}`)).toBeInTheDocument();
      unmount();
    }
  });

  it('handles unknown interaction types gracefully', () => {
    render(UnsupportedInteraction, {
      props: { originalTag: 'qti-unknown-interaction' },
    });
    expect(screen.getByText('Unsupported interaction: Unknown')).toBeInTheDocument();
  });

  it('renders empty type when no originalTag provided', () => {
    render(UnsupportedInteraction, {
      props: { originalTag: '' },
    });
    expect(screen.queryByText(/Unsupported interaction:/)).not.toBeInTheDocument();
  });

  it('has the correct accessible role', () => {
    render(UnsupportedInteraction, {
      props: { originalTag: 'qti-hotspot-interaction' },
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});