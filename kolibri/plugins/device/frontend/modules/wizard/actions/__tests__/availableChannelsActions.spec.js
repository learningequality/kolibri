import { getRemoteChannelByToken } from '../../utils';
import { getAllRemoteChannels } from '../availableChannelsActions';
import { makeAvailableChannelsPageStore } from '../../../../__tests__/utils/makeStore';

jest.mock('../../utils');

const installedDraftChannel = {
  id: 'draft_channel',
  name: 'Draft Channel',
  version: 0,
  available: true,
};

const installedPublishedChannel = {
  id: 'published_channel',
  name: 'Published Unlisted Channel',
  version: 5,
  available: true,
};

describe('getAllRemoteChannels', () => {
  afterEach(() => {
    getRemoteChannelByToken.mockReset();
  });

  it('draft channel (version=0) appears in list when Studio returns 404', () => {
    getRemoteChannelByToken.mockRejectedValue({ status: 404 });
    const store = makeAvailableChannelsPageStore({ channelList: [installedDraftChannel] });
    return getAllRemoteChannels({ rootState: store.state }, []).then(channels => {
      expect(channels).toHaveLength(1);
      expect(channels[0].id).toBe('draft_channel');
      expect(channels[0].installed_version).toBe(0);
      expect(channels[0]).not.toHaveProperty('latest_version');
    });
  });

  it('draft channel with published version on Studio shows latest_version', () => {
    getRemoteChannelByToken.mockResolvedValue({ id: 'draft_channel', version: 3 });
    const store = makeAvailableChannelsPageStore({ channelList: [installedDraftChannel] });
    return getAllRemoteChannels({ rootState: store.state }, []).then(channels => {
      expect(channels).toHaveLength(1);
      expect(channels[0].installed_version).toBe(0);
      expect(channels[0].latest_version).toBe(3);
    });
  });

  it('non-draft channel is filtered out when Studio returns 404', () => {
    getRemoteChannelByToken.mockRejectedValue({ status: 404 });
    const store = makeAvailableChannelsPageStore({ channelList: [installedPublishedChannel] });
    return getAllRemoteChannels({ rootState: store.state }, []).then(channels => {
      expect(channels).toHaveLength(0);
    });
  });

  it('non-draft channel with Studio version resolves normally', () => {
    getRemoteChannelByToken.mockResolvedValue({
      id: 'published_channel',
      version: 7,
    });
    const store = makeAvailableChannelsPageStore({ channelList: [installedPublishedChannel] });
    return getAllRemoteChannels({ rootState: store.state }, []).then(channels => {
      expect(channels).toHaveLength(1);
      expect(channels[0].installed_version).toBe(5);
      expect(channels[0].latest_version).toBe(7);
    });
  });

  it('public channels are appended after unlisted channels', () => {
    getRemoteChannelByToken.mockRejectedValue({ status: 404 });
    const store = makeAvailableChannelsPageStore({ channelList: [installedDraftChannel] });
    const publicChannel = { id: 'public_channel', name: 'Public', version: 1, available: true };
    return getAllRemoteChannels({ rootState: store.state }, [publicChannel]).then(channels => {
      expect(channels).toHaveLength(2);
      expect(channels[1].id).toBe('public_channel');
    });
  });
});
