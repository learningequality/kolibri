import { render, screen } from '@testing-library/vue';
import { h } from 'vue';
import SafeHtmlTable from '../SafeHtmlTable.js';

// Create a table element with m rows and n columns
const createSampleNode = (m, n) => {
  const table = document.createElement('table');

  // Caption
  const caption = document.createElement('caption');
  caption.textContent = 'Sample Caption';
  table.appendChild(caption);

  if (m < 1 || n < 1) {
    return table;
  }

  // Thead (row 1)
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
const sampleTableCounter = 6;
const sampleWindowSizeClass = 'small-window';

const mapNode = jest.fn(node => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    return h(node.tagName.toLowerCase(), { attrs: sampleAttributes }, mapChildren(node.childNodes));
  } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
    return node.textContent;
  }
  return null;
});

const mapChildren = jest.fn(childNodes => Array.from(childNodes).map(mapNode).filter(Boolean));

const renderComponent = (m, n) => {
  return render(SafeHtmlTable, {
    props: {
      node: createSampleNode(m, n),
      attributes: sampleAttributes,
      tableCounter: sampleTableCounter,
      windowSizeClass: sampleWindowSizeClass,
      mapNode,
      mapChildren,
    },
  });
};

describe('SafeHtmlTable', () => {
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

    test('renders the caption', () => {
      expect(screen.getByText('Sample Caption')).toBeInTheDocument();
    });
  });

  describe('class and a11y attributes', () => {
    beforeEach(() => {
      renderComponent(3, 3);
    });

    test('table has safe-html class', () => {
      expect(screen.getByRole('table')).toHaveClass('safe-html');
    });

    test('caption has safe-html and small-window classes', () => {
      expect(screen.getByText('Sample Caption')).toHaveClass('safe-html', 'small-window');
    });

    test('non-caption child nodes have safe-html class', () => {
      const rowGroups = screen.getAllByRole('rowgroup'); // thead, tbody, tfoot
      rowGroups.forEach(rowGroup => expect(rowGroup).toHaveClass('safe-html'));

      const trs = screen.getAllByRole('row');
      trs.forEach(tr => expect(tr).toHaveClass('safe-html'));

      const ths = screen.getAllByRole('columnheader');
      ths.forEach(th => expect(th).toHaveClass('safe-html'));
      const tds = screen.getAllByRole('cell');
      tds.forEach(td => expect(td).toHaveClass('safe-html'));
    });

    test('caption has correct id', () => {
      expect(screen.getByText('Sample Caption')).toHaveAttribute('id', 'table-caption-6');
    });

    test('container div has correct aria-labelledby', () => {
      expect(screen.getByTestId('table-container')).toHaveAttribute(
        'aria-labelledby',
        'table-caption-6',
      );
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
