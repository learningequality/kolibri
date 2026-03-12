import { render, screen } from '@testing-library/vue';
import AttendanceNewPage from '../AttendanceNewPage.vue';
import AttendanceHistoryPage from '../AttendanceHistoryPage.vue';
import AttendanceEditPage from '../AttendanceEditPage.vue';

describe('AttendanceNewPage', () => {
  it('renders the page heading', () => {
    render(AttendanceNewPage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mark Attendance');
  });
});

describe('AttendanceHistoryPage', () => {
  it('renders the page heading', () => {
    render(AttendanceHistoryPage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Attendance History');
  });
});

describe('AttendanceEditPage', () => {
  it('renders the page heading', () => {
    render(AttendanceEditPage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit Attendance');
  });
});
