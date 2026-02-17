import { render, screen, fireEvent, cleanup } from '@testing-library/vue';
import Bookmarks from '../SideBar/Bookmarks/index.vue';
import '@testing-library/jest-dom';

const outline = [
  {
    dest: [{ num: 89 }],
    title: 'Local Connection',
    items: [
      {
        dest: [{ num: 1 }],
        title: 'Power source item',
        items: [],
      },
    ],
  },
];

describe('Pdf Bookmarks', () => {
  afterEach(cleanup);

  it('renders the root bookmark titles', () => {
    render(Bookmarks, { 
      props: { outline, goToDestination: jest.fn() } 
    });
    
    expect(screen.getByText('Local Connection')).toBeInTheDocument();
  });

  it('toggles children bookmarks when the dropdown icon is clicked', async () => {
    render(Bookmarks, { 
      props: { outline, goToDestination: jest.fn() } 
    });

    // Sub-item should not be visible initially
    expect(screen.queryByText('Power source item')).not.toBeInTheDocument();

    // Find the toggle button (Kolibri usually uses an icon or button for this)
    const toggle = document.querySelector('.dropdown-icon-container');
    await fireEvent.click(toggle);

    // Sub-item should now be visible in the DOM
    expect(screen.getByText('Power source item')).toBeInTheDocument();
  });

  it('calls goToDestination with the correct data when a title is clicked', async () => {
    const goToDestination = jest.fn();
    render(Bookmarks, { 
      props: { outline, goToDestination } 
    });

    const link = screen.getByText('Local Connection');
    await fireEvent.click(link);

    expect(goToDestination).toHaveBeenCalledWith(outline[0].dest);
  });
});