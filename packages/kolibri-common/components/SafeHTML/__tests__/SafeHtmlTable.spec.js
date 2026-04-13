import { render, screen } from '@testing-library/vue';
import SafeHtmlTable from '../SafeHtmlTable.vue';

// Create a table element with m rows and n columns
const createSampleNode = (m, n) => {
  const table = document.createElement('table');

  const caption = document.createElement('caption');
  caption.textContent = 'Sample Caption';
  table.appendChild(caption);

  if (m < 1 || n < 1) return table;

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

  // Tbody (rows 2 to m-1)
  if (m >= 3) {
    const tbody = document.createElement('tbody');
    for (let row = 2; row < m; row++) {
      const tr = document.createElement('tr');
      for (let col = 1; col <= n; col++) {
        const td = document.createElement('td');
        td.textContent = `${row},${col}`;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
  }

  // Tfoot (row m if m >= 2)
  if (m >= 2) {
    const tfoot = document.createElement('tfoot');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = n;
    td.textContent = `${m},1-${n}`;
    tr.appendChild(td);
    tfoot.appendChild(tr);
    table.appendChild(tfoot);
  }

  return table;
};

const sampleAttributes = { class: 'safe-html' };

const renderComponent = (m, n) => {
  const node = createSampleNode(m, n);
  return render(SafeHtmlTable, {
    props: { node },
    attrs: sampleAttributes,
    slots: { default: node.innerHTML },
  });
};

describe('SafeHtmlTable', () => {
  describe('first render', () => {
    beforeEach(() => {
      renderComponent(3, 3);
    });

    it('smoke test', () => {
      expect(screen.getByTestId('table-container')).toBeInTheDocument();
    });

    it('renders the table', () => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders caption element', () => {
      const table = screen.getByRole('table');
      const caption = table.querySelector('caption');
      expect(caption).toBeDefined();
      expect(caption).toHaveTextContent('Sample Caption');
    });

    it('renders thead, tbody, tfoot', () => {
      const table = screen.getByRole('table');
      expect(table.querySelector('thead')).toBeInTheDocument();
      expect(table.querySelector('tbody')).toBeInTheDocument();
      expect(table.querySelector('tfoot')).toBeInTheDocument();
    });

    it('tbody and tfoot have correct content', () => {
      const table = screen.getByRole('table');
      const tbodyCells = table.querySelectorAll('tbody tr td');
      if (tbodyCells.length > 0) {
        expect(tbodyCells[0]).toHaveTextContent('2,1'); // first cell in tbody
      }
      const tfootCell = table.querySelector('tfoot tr td');
      expect(tfootCell).toHaveTextContent('3,1-3');
    });
  });

  describe('table is set to the correct width', () => {
    it('table with <= 3 columns has a 640px width', () => {
      renderComponent(4, 3);
      expect(screen.getByRole('table')).toHaveStyle('width: 640px;');
    });

    it("table with > 3 columns has a 'n * 200px' width", () => {
      renderComponent(5, 4);
      expect(screen.getByRole('table')).toHaveStyle('width: 800px;');
    });
  });
});
