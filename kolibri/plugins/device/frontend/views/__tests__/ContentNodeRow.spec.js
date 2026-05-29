import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTranslator } from 'kolibri/utils/i18n';
import ContentNodeRow from '../SelectContentPage/ContentNodeRow';
import { makeNode } from '../../__tests__/utils/data';
import router from './testRouter';

const tr = createTranslator('ContentNodeRow', ContentNodeRow.$trs);

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
  const NODE_TITLE = defaultProps.node.title;
  const NODE_ID = defaultProps.node.id;
  const NODE_MESSAGE = defaultProps.message;

  it('shows the correct title', () => {
    renderComponent();
    expect(screen.getByText(NODE_TITLE, { selector: 'span' })).toBeInTheDocument();
  });

  it('shows the correct message', async () => {
    renderComponent();
    expect(screen.getByText(NODE_MESSAGE)).toBeInTheDocument();
  });

  it('when node is not a topic, title is just text', () => {
    renderComponent({
      node: makeNode('1', {
        kind: 'video',
      }),
    });
    const VIDEO_NODE_TITLE = 'node_1';
    expect(screen.queryByRole('link', { name: VIDEO_NODE_TITLE })).not.toBeInTheDocument();
    expect(screen.getByText(VIDEO_NODE_TITLE, { selector: 'span' })).toBeInTheDocument();
  });

  it('when node is disabled, checkbox is disabled but link remains navigable', async () => {
    renderComponent({ disabled: true });
    expect(screen.getByRole('checkbox')).toBeDisabled();
    const link = screen.getByRole('link', { name: NODE_TITLE });
    const expectedSubstring = `node_id=${NODE_ID}`;
    expect(link).toHaveAttribute('href', expect.stringContaining(expectedSubstring));
  });

  it('topic links have the correct route', async () => {
    renderComponent();
    const link = screen.getByRole('link', { name: NODE_TITLE });
    const expectedSubstring = `node_id=${NODE_ID}`;
    expect(link).toHaveAttribute('href', expect.stringContaining(expectedSubstring));
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
    const NODE_TITLE = 'My Course';
    const NODE_KIND = 'topic';
    const NODE_MODALITY = 'COURSE';
    const NODE_ID = 'course_1';

    const NODE = {
      title: NODE_TITLE,
      kind: NODE_KIND,
      modality: NODE_MODALITY,
      id: NODE_ID,
    };

    it('does not render a link for course nodes even though they are topics', () => {
      renderComponent({
        node: NODE,
      });
      expect(screen.queryByRole('link', { name: NODE_TITLE })).not.toBeInTheDocument();
    });

    it('uses the course icon instead of topic icon for course nodes', () => {
      renderComponent({
        node: NODE,
      });
      expect(screen.getByTestId('icon-course')).toBeInTheDocument();
    });

    it('prepends "Course: " to the title for course nodes', () => {
      renderComponent({
        node: NODE,
      });
      expect(
        screen.getByText(tr.$tr('coursePrefixedTitle', { title: NODE_TITLE })),
      ).toBeInTheDocument();
    });
  });
});
