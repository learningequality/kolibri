import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTranslator } from 'kolibri/utils/i18n';
import ContentTreeViewer from '../SelectContentPage/ContentTreeViewer';
import { makeNode } from '../../__tests__/utils/data';
import { makeSelectContentPageStore } from '../../__tests__/utils/makeStore';
import router from './testRouter';

const ContentTreeViewerStrings = createTranslator('ContentTreeViewer', ContentTreeViewer.$trs);

jest.mock('kolibri/urls');
jest.mock('kolibri/client');

function simplePath(ids) {
  return ids.map(makeNode);
}

function renderComponent(options = {}) {
  const { props = {}, store } = options;
  return render(ContentTreeViewer, {
    props,
    store: store || makeSelectContentPageStore(),
    ...router,
  });
}

describe('ContentTreeViewer component', () => {
  let store;

  function setChildren(children) {
    store.state.manageContent.wizard.currentTopicNode.children = children;
  }

  function setIncludedNodes(nodes) {
    store.commit('manageContent/wizard/REPLACE_INCLUDE_LIST', nodes);
  }

  function setOmittedNodes(nodes) {
    store.commit('manageContent/wizard/REPLACE_OMIT_LIST', nodes);
  }

  beforeEach(() => {
    store = makeSelectContentPageStore();
  });

  it('in REMOTEIMPORT, all nodes are shown', () => {
    // API does annotate them as being importable, though...
    store.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'remoteimport');
    store.commit('manageContent/wizard/SET_CURRENT_TOPIC_NODE', {
      id: 'topic',
      children: [
        {
          ...makeNode('1'),
          available: false,
          importable: true,
        },
        {
          ...makeNode('1'),
          available: true,
          importable: true,
        },
      ],
    });

    renderComponent({ store });
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('if in LOCALIMPORT, then non-importable nodes are filtered from the list', () => {
    store.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'localimport');
    store.commit('manageContent/wizard/SET_CURRENT_TOPIC_NODE', {
      id: 'topic',
      children: [
        {
          ...makeNode('1'),
          importable: true,
        },
        {
          ...makeNode('1'),
          importable: false,
        },
      ],
    });
    renderComponent({ store });
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('in LOCALEXPORT, if a node has available: false, then it is not shown', () => {
    store.commit('manageContent/wizard/SET_TRANSFER_TYPE', 'localexport');
    store.commit('manageContent/wizard/SET_CURRENT_TOPIC_NODE', {
      id: 'topic',
      children: [
        {
          ...makeNode('1'),
          available: true,
          importable: true,
        },
        {
          ...makeNode('1'),
          available: false,
          importable: false,
        },
      ],
    });

    renderComponent({ store });
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('shows an empty state if the topic has no children', () => {
    setChildren([]);
    renderComponent({ store });
    expect(
      screen.getByText(ContentTreeViewerStrings.$tr('topicHasNoContents')),
    ).toBeInTheDocument();
  });

  it('checks child nodes are rendered at their correct full path', () => {
    const CHANNEL_ID = 'channel_1';
    const CHANNEL_TITLE = 'Channel 1';
    const TOPIC_ID = 'topic_1';
    const TOPIC_TITLE = 'Topic 1';
    store.state.manageContent.wizard.path = [
      { id: CHANNEL_ID, title: CHANNEL_TITLE },
      { id: TOPIC_ID, title: TOPIC_TITLE },
    ];

    renderComponent({ store });
    const navPath = screen.getByRole('list');
    expect(within(navPath).getByRole('link', { name: CHANNEL_TITLE })).toBeInTheDocument();
    expect(within(navPath).getByText(TOPIC_TITLE)).toBeInTheDocument();
  });

  describe('"select all" checkbox state', () => {
    it('if neither topic nor any ancestor is selected, then "Select All" is unchecked', () => {
      renderComponent({ store });
      expect(
        screen.getByRole('checkbox', { name: ContentTreeViewerStrings.$tr('selectAll') }),
      ).not.toBeChecked();
    });

    it('if any ancestor of the topic is selected, then "Select All" is checked', () => {
      store.state.manageContent.wizard.path = [{ id: 'channel_1' }];
      setIncludedNodes([makeNode('channel_1')]);
      renderComponent({ store });
      expect(
        screen.getByRole('checkbox', { name: ContentTreeViewerStrings.$tr('selectAll') }),
      ).toBeChecked();
    });

    it('if the topic itself is selected, then "Select All" is checked', () => {
      setIncludedNodes([makeNode('topic_1')]);
      renderComponent({ store });
      expect(
        screen.getByRole('checkbox', { name: ContentTreeViewerStrings.$tr('selectAll') }),
      ).toBeChecked();
    });

    it('if topic is selected, but one descendant is omitted then "Select All" is unchecked', () => {
      // ...then "Select All" is unchecked
      setIncludedNodes([makeNode('topic_1')]);
      setOmittedNodes([makeNode('subtopic_1', { path: [{ id: 'topic_1' }] })]);
      renderComponent({ store });
      expect(
        screen.getByRole('checkbox', { name: ContentTreeViewerStrings.$tr('selectAll') }),
      ).not.toBeChecked();
    });
  });

  describe('toggling "select all" checkbox', () => {
    beforeEach(() => {
      jest.spyOn(store, 'dispatch').mockResolvedValue();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('if unchecked, clicking the "Select All" for the topic triggers an "add node" action', async () => {
      // Selected w/ unselected child scenario
      const NODE_ID = 'topic_1';
      setIncludedNodes([makeNode(NODE_ID, { total_resources: 1000 })]);
      setOmittedNodes([makeNode('subtopic_1', { path: [{ id: NODE_ID, title: '' }] })]);
      renderComponent({ store });
      const selectAllCheckbox = screen.getByRole('checkbox', {
        name: ContentTreeViewerStrings.$tr('selectAll'),
      });
      await userEvent.click(selectAllCheckbox);
      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(store.dispatch).toHaveBeenCalledWith(
        'manageContent/wizard/addNodeForTransfer',
        expect.objectContaining({ id: NODE_ID }),
      );
    });

    it('if topic is checked, clicking the "Select All" for the topic triggers a "remove node" action ', async () => {
      const NODE_ID = 'topic_1';
      setIncludedNodes([makeNode(NODE_ID)]);
      renderComponent({ store });
      const selectAllCheckbox = screen.getByRole('checkbox', {
        name: ContentTreeViewerStrings.$tr('selectAll'),
      });
      await userEvent.click(selectAllCheckbox);
      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(store.dispatch).toHaveBeenCalledWith(
        'manageContent/wizard/removeNodeForTransfer',
        expect.objectContaining({ id: NODE_ID }),
      );
    });
  });

  describe('selecting child nodes', () => {
    it('unchecks a checked child node checkbox when clicked', async () => {
      const SUB_TOPIC_ID = 'subtopic_1';
      const SUB_TOPIC_TITLE = 'node_subtopic_1';
      const subTopic = makeNode('subtopic_1', {
        path: [{ id: SUB_TOPIC_ID, title: SUB_TOPIC_TITLE }],
        total_resources: 100,
        on_device_resources: 50,
      });
      setChildren([subTopic]);
      setIncludedNodes([subTopic]);
      renderComponent({ store });
      const checkbox = screen.getByRole('checkbox', { name: SUB_TOPIC_TITLE });
      expect(checkbox).toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('checks a unchecked child node checkbox when clicked', async () => {
      const SUB_TOPIC_ID = 'subtopic_1';
      const SUB_TOPIC_TITLE = 'node_subtopic_1';
      // Need to add at least two children, so clicking subtopic doesn't complete the topic
      const subTopic = makeNode('subtopic_1', {
        path: [{ id: SUB_TOPIC_ID, title: SUB_TOPIC_TITLE }],
        total_resources: 100,
        on_device_resources: 50,
      });
      const subTopic2 = makeNode('subtopic_2', {
        path: [{ id: SUB_TOPIC_ID, title: SUB_TOPIC_TITLE }],
        total_resources: 100,
        on_device_resources: 50,
      });
      setChildren([subTopic, subTopic2]);
      renderComponent({ store });
      const checkbox = screen.getByRole('checkbox', { name: SUB_TOPIC_TITLE });
      expect(checkbox).not.toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('selects an indeterminate child node when clicked', async () => {
      const subTopic = makeNode('subtopic', {
        path: simplePath(['channel_1', 'topic_1']),
        total_resources: 5,
      });
      const subTopic2 = makeNode('subtopic2', {
        path: simplePath(['channel_1', 'topic_1']),
        total_resources: 5,
      });
      const subSubTopic = makeNode('subsubtopic', {
        path: simplePath(['channel_1', 'topic_1', 'subtopic']),
        total_resources: 1,
      });

      const SUB_TOPIC_TITLE = 'node_subtopic';

      store.state.manageContent.wizard.path = simplePath(['channel_1']);
      setChildren([subTopic, subTopic2]);
      setIncludedNodes([subSubTopic]);
      renderComponent({ store });
      const checkbox = screen.getAllByRole('checkbox', { name: SUB_TOPIC_TITLE })[0];
      expect(checkbox).not.toBeChecked();
      expect(checkbox).toHaveProperty('indeterminate', true);
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });
});
