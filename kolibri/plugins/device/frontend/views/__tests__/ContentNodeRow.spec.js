import { queryByDisplayValue, render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ContentNodeRow from '../SelectContentPage/ContentNodeRow';
import { makeNode } from '../../__tests__/utils/data';
import router from './testRouter';

const defaultProps = {
  node: {
    title: 'Awesome Content',
    kind: 'topic',
    id: 'awesome_content',
  },
  message: 'HELLO',
  getLinkObject(node) {
    return {
      name: 'SELECT_CONTENT',
      query: {
        node_id: node.id,
      },
    };
  },
};

function renderComponent(props = {}) {
  return render(ContentNodeRow, {
    props: { ...defaultProps, ...props },
    ...router,
  });
}

describe('contentNodeRow component', () => {
  it('shows the correct title', () => {
    renderComponent();
    expect(screen.getByText('Awesome Content', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows the correct message when checkbox is checked', async () => {
    renderComponent();
    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);
    expect(screen.getByText('HELLO')).toBeInTheDocument();
  });

  it('when node is not a topic, title is just text', () => {
    renderComponent({
      node: makeNode('1', {
        kind: 'video',
      }),
    });

    expect(screen.queryByRole('link', { name: /node_1/i })).not.toBeInTheDocument();
    expect(screen.getByText('node_1', { selector: 'span' })).toBeInTheDocument();
  });

  it('when node is disabled, title is just text', () => {
    renderComponent({ disabled: true });

    const link = screen.queryByRole('link', { name: 'Awesome Content' });
    expect(link).toHaveAttribute('href', undefined);
  });

  it('topic links have the correct route', async () => {
    renderComponent();
    const link = screen.getByRole('link', { name: 'Awesome Content' });
    expect(link).toHaveAttribute('href', expect.stringContaining('node_id=awesome_content'));
  });

  it('checks the checkbox when clicked if initially unchecked', async () => {
    renderComponent({ checked: false });
    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('unchecks the checkbox when clicked if initially checked', async () => {
    renderComponent({ checked: true });
    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('when props.disabled, the checkbox is disabled', () => {
    renderComponent({ disabled: true });
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('when props.checked, the checkbox is checked', () => {
    renderComponent({
      disabled: true,
      checked: true,
    });
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('when props.indeterminate, the checkbox is indeterminate', () => {
    renderComponent({ disabled: true, checked: true, indeterminate: true });
    expect(screen.getByRole('checkbox')).toHaveProperty('indeterminate', true);
  });

  describe('course modality nodes', () => {
    it('does not render a link for course nodes even though they are topics', () => {
      renderComponent({
        node: {
          title: 'My Course',
          kind: 'topic',
          modality: 'COURSE',
          id: 'course_1',
        },
      });

      expect(screen.queryByRole('link', { name: 'My Course' })).not.toBeInTheDocument();
    });

    it('uses the course icon instead of topic icon for course nodes', () => {
      renderComponent({
        node: {
          title: 'My Course',
          kind: 'topic',
          modality: 'COURSE',
          id: 'course_1',
        },
      });

      expect(screen.getByTestId('icon-course')).toBeInTheDocument();
    });

    it('prepends "Course: " to the title for course nodes', () => {
      renderComponent({
        node: {
          title: 'My Course',
          kind: 'topic',
          modality: 'COURSE',
          id: 'course_1',
        },
      });

      expect(screen.getByText(/Course:.*My Course/i)).toBeInTheDocument();
    });
  });
});
