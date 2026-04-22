import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import TableOfContentsSection from '../TableOfContentsSection';

const section = {
  label: 'Top level section',
  href: 'href1',
};

const sectionWithEmptyLabel = {
  label: '  ',
  href: 'href1',
};

const sectionWithSubItems = {
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
};

function renderComponent({ section, depth, currentSection } = {}) {
  return render(TableOfContentsSection, {
    props: {
      section,
      depth,
      currentSection,
    },
  });
}

describe('Table of Contents Section', () => {
  it('renders a section label correctly', () => {
    renderComponent({ section, depth: 0 });
    expect(screen.getByText(section.label)).toBeInTheDocument();
  });

  it('renders nested sub-items when a section has subitems', () => {
    renderComponent({ section: sectionWithSubItems, depth: 0 });
    expect(screen.getByText(sectionWithSubItems.label)).toBeInTheDocument();
    expect(screen.getByText(sectionWithSubItems.subitems[0].label)).toBeInTheDocument();
    expect(screen.getByText(sectionWithSubItems.subitems[0].subitems[0].label)).toBeInTheDocument();
  });

  it('displays the href as fallback text if the label is empty', () => {
    renderComponent({ section: sectionWithEmptyLabel, depth: 0 });
    expect(screen.getByText(sectionWithEmptyLabel.href)).toBeInTheDocument();
  });

  it('applies the appropriate top-level styling class for root level sections', () => {
    renderComponent({ section, depth: 0 });
    const listItem = screen.getByText(section.label).closest('li');
    expect(listItem).toHaveClass('toc-list-item-top-level');
  });

  it('does not apply the top-level styling class for nested sections', () => {
    renderComponent({ section, depth: 1 });
    const listItem = screen.getByText(section.label).closest('li');
    expect(listItem).not.toHaveClass('toc-list-item-top-level');
  });

  it('visually highlights the section if it is the current section', () => {
    renderComponent({ section, depth: 0, currentSection: section });
    const button = screen.getByText(section.label).closest('.toc-list-item-button');
    expect(button).toHaveClass('toc-list-item-button-current');
  });

  it('does not highlight the section if it is not the current section', () => {
    renderComponent({
      section,
      depth: 0,
      currentSection: { label: 'Random section', href: 'href' },
    });
    const button = screen.getByText(section.label).closest('.toc-list-item-button');
    expect(button).not.toHaveClass('toc-list-item-button-current');
  });

  it('emits a navigation event when the section is clicked', async () => {
    const { emitted } = renderComponent({ section, depth: 0 });
    await fireEvent.click(screen.getByText(section.label));
    expect(emitted()).toHaveProperty('tocNavigation');
    expect(emitted().tocNavigation[0][0]).toEqual(section);
  });
});
