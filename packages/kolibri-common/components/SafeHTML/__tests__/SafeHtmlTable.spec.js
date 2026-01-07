import { render, screen } from '@testing-library/vue';
import SafeHtmlTable from '../SafeHtmlTable.vue';

// Create a table element with m rows and n columns
const createSampleNode = (m, n) => {
  const table = document.createElement('table');

  const caption = document.createElement('caption');
  caption.textContent = 'Sample Caption';
  table.appendChild(caption);

  if (m < 1 || n < 1) {
    return table;
  }

  const thead = document.createElement('thead');
  const theadRow = document.createElement('tr');
  for (let col = 1; col <= n; col++) {
    const th = document.createElement('th');
    th.textContent = `1, ${col}`;
    theadRow.appendChild(th);
  }
  thead.appendChild(theadRow);
  table.appendChild(thead);

  // Tbody (row 2 to row m-1 if m >= 3)
  if (m >= 3) {
    const tbody = document.createElement('tbody');
    for (let row = 2; row < m; row++) {
      const tr = document.createElement('tr');
      for (let col = 1; col <= n; col++) {
        const td = document.createElement('td');
        td.textContent = `${row}, ${col}`;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
  }

  // Tfoot (row m if m >= 2)
  if (m >= 2) {
    const tfoot = document.createElement('tfoot');
    const tfootRow = document.createElement('tr');
    const tfootCell = document.createElement('td');
    tfootCell.colSpan = n;
    tfootCell.textContent = `${m}, 1-${n}`;
    tfootRow.appendChild(tfootCell);
    tfoot.appendChild(tfootRow);
    table.appendChild(tfoot);
  }

  return table;
};

const sampleAttributes = { class: 'safe-html' };
const mapChildren = jest.fn(() => []);

const renderComponent = (m, n) => {
  return render(SafeHtmlTable, {
    props: {
      node: createSampleNode(m, n),
      attributes: sampleAttributes,
      mapChildren,
    },
  });
};

describe('SafeHtmlTable', () => {
  beforeEach(() => {
    mapChildren.mockClear();
  });

  describe('first render', () => {
    beforeEach(() => {
      renderComponent(0, 0);
    });

    test('smoke test', () => {
      expect(screen.getByTestId('table-container')).toBeInTheDocument();
    });

    test('renders the table', () => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    test('passes caption element to mapChildren', () => {
      expect(mapChildren).toHaveBeenCalled();
      const childNodes = mapChildren.mock.calls[0][0];
      const captionNode = Array.from(childNodes).find(
        node => node.tagName && node.tagName.toLowerCase() === 'caption',
      );
      expect(captionNode).toBeDefined();
      expect(captionNode).toHaveTextContent('Sample Caption');
    });
  });

  describe('table is set to the correct width', () => {
    test('table with <= 3 columns has a 640px width', () => {
      renderComponent(4, 3);
      expect(screen.getByRole('table')).toHaveStyle('width: 640px;');
    });

    test("table with > 3 columns has a 'n * 200px' width", () => {
      renderComponent(5, 4);
      expect(screen.getByRole('table')).toHaveStyle('width: 800px;');
    });
  });
});
