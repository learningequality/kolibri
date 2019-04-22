import { mount } from '@vue/test-utils';
import LessonsSearchFilters from '../LessonsSearchFilters';
import makeStore from '../../../../../../test/makeStore';

function makeWrapper(props) {
  const wrapper = mount(LessonsSearchFilters, {
    store: makeStore(),
    propsData: {
      value: {
        kind: 'html5',
        channel: '123',
        role: null,
      },
      searchResults: {
        results: [],
        content_kinds: [],
        channel_ids: [],
      },
      ...props,
    },
  });
  const kSelects = () => wrapper.findAll({ name: 'KSelect' });
  const els = {
    kindSelect: () => kSelects().at(0),
    channelSelect: () => kSelects().at(1),
    roleSelect: () => kSelects().at(2),
  };
  return { wrapper, els };
}

describe('LessonsSearchFilters', () => {
  it('has the correct content kind filter options based on search results', () => {
    const { wrapper, els } = makeWrapper();
    wrapper.setProps({
      searchResults: {
        results: [],
        channel_ids: [],
        content_kinds: ['html5', 'exercise'],
      },
    });
    expect(els.kindSelect().props().options).toEqual([
      { label: 'All', value: null },
      { label: 'Apps', value: 'html5' },
      { label: 'Exercises', value: 'exercise' },
    ]);
  });

  it('has the correct channel filter options based on search results', () => {
    const { wrapper, els } = makeWrapper();
    wrapper.vm.$store.state.core.channels.list = [{ id: '123', title: 'Channel 123' }];
    wrapper.setProps({
      searchResults: {
        channel_ids: ['123'],
        content_kinds: [],
        results: [{ kind: 'html5', channel_id: '123' }, { kind: 'exercise', channel_id: '123' }],
      },
    });
    expect(els.channelSelect().props().options).toEqual([
      { label: 'All', value: null },
      { label: 'Channel 123', value: '123' },
    ]);
  });

  it('does not show role filter options when there are no coach contents', () => {
    const { wrapper } = makeWrapper();
    const kSelects = wrapper.findAll({ name: 'KSelect' });
    expect(kSelects.length).toEqual(2);
  });

  it('has the correct role filter options when there are coach contents', () => {
    const { wrapper, els } = makeWrapper();
    wrapper.setProps({
      searchResults: {
        channel_ids: [],
        content_kinds: [],
        results: [
          { kind: 'topic', channel_id: '123', num_coach_contents: 1 },
          { kind: 'exercise', channel_id: '123', num_coach_contents: 0 },
        ],
      },
    });
    expect(els.roleSelect().props().options).toEqual([
      { label: 'Show', value: null },
      { label: 'Hide', value: 'nonCoach' },
    ]);
  });

  it('emits the correct event when the content kind filter has changed', () => {
    const { wrapper, els } = makeWrapper();
    els.kindSelect().vm.$emit('change', { value: 'documents' });
    expect(wrapper.emitted().input[0][0]).toEqual({
      channel: '123',
      kind: 'documents',
      role: null,
    });
  });

  it('emits the correct event when the channel filter has changed', () => {
    const { wrapper, els } = makeWrapper();
    els.channelSelect().vm.$emit('change', { value: '456' });
    expect(wrapper.emitted().input[0][0]).toEqual({
      channel: '456',
      kind: 'html5',
      role: null,
    });
  });

  it('emits the correct event when the role filter has changed', () => {
    const { wrapper, els } = makeWrapper({
      searchResults: {
        channel_ids: [],
        content_kinds: [],
        results: [
          { kind: 'topic', channel_id: '123', num_coach_contents: 1 },
          { kind: 'exercise', channel_id: '123', num_coach_contents: 0 },
        ],
      },
    });
    els.roleSelect().vm.$emit('change', { value: 'coach' });
    expect(wrapper.emitted().input[0][0]).toEqual({
      channel: '123',
      kind: 'html5',
      role: 'coach',
    });
  });
});
