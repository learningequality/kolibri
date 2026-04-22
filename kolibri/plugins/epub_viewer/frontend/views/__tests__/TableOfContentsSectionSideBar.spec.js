import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import TableOfContentsSideBar from '../TableOfContentsSideBar';

const toc = [
  {
    label: 'Top level section',
    href: 'href1',
    subitems: [
      {
        label: 'Second level section',
        href: 'href2',
        subitems: [
          {
            label: 'Third level section',
            href: 'href3',
          },
        ],
      },
    ],
  },
];

const currentSection = {
  label: 'Third level section',
  href: 'href3',
};

function renderComponent({ toc, currentSection } = {}) {
  return render(TableOfContentsSideBar, {
    props: {
      toc,
      currentSection,
    },
  });
}

describe('Table of Contents Side Bar', () => {
  it('renders the sidebar with all sections', () => {
    renderComponent({ toc });
    expect(screen.getByText(toc[0].label)).toBeInTheDocument();
    expect(screen.getByText(toc[0].subitems[0].label)).toBeInTheDocument();
    expect(screen.getByText(toc[0].subitems[0].subitems[0].label)).toBeInTheDocument();
  });

  it('renders the correct nested list structure for the given toc', () => {
    renderComponent({ toc });
    expect(screen.getAllByRole('list')).toHaveLength(3);
  });

  it('emits a tocNavigation event when a specific section is clicked', async () => {
    const { emitted } = renderComponent({ toc });
    await fireEvent.click(screen.getByText(currentSection.label));
    expect(emitted()).toHaveProperty('tocNavigation');
    expect(emitted().tocNavigation[0][0]).toEqual({
      label: currentSection.label,
      href: currentSection.href,
    });
  });

  it('visually highlights the currently active section', () => {
    renderComponent({ toc, currentSection });
    const activeButton = screen.getByText(currentSection.label).closest('.toc-list-item-button');
    expect(activeButton).toHaveClass('toc-list-item-button-current');
  });
});
