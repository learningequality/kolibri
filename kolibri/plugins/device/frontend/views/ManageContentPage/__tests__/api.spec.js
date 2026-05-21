import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';
import ChannelResource from '../../../apiResources/deviceChannel';
import { fetchChannelAtSource } from '../api';

jest.mock('kolibri-common/apiResources/RemoteChannelResource');

const installedDraftChannel = {
  id: 'draft_channel',
  name: 'Draft Channel',
  version: 0,
};

const installedPublishedChannel = {
  id: 'published_channel',
  name: 'Published Channel',
  version: 5,
};

describe('fetchChannelAtSource (Studio source)', () => {
  beforeAll(() => {
    ChannelResource.fetchModel = jest.fn();
  });

  afterEach(() => {
    ChannelResource.fetchModel.mockReset();
    RemoteChannelResource.fetchModel.mockReset();
  });

  it('draft channel (version=0): resolves with [installedChannel, null] when Studio returns 404', () => {
    ChannelResource.fetchModel.mockResolvedValue(installedDraftChannel);
    RemoteChannelResource.fetchModel.mockRejectedValue({ status: 404 });
    return fetchChannelAtSource({ channel_id: 'draft_channel' }).then(([installed, source]) => {
      expect(installed).toEqual(installedDraftChannel);
      expect(source).toBeNull();
    });
  });

  it('draft channel (version=0): resolves with [installedChannel, studioChannel] when Studio has a version', () => {
    const studioChannel = { id: 'draft_channel', version: 2 };
    ChannelResource.fetchModel.mockResolvedValue(installedDraftChannel);
    RemoteChannelResource.fetchModel.mockResolvedValue(studioChannel);
    return fetchChannelAtSource({ channel_id: 'draft_channel' }).then(([installed, source]) => {
      expect(installed).toEqual(installedDraftChannel);
      expect(source).toEqual(studioChannel);
    });
  });

  it('non-draft channel: rejects when Studio returns 404', () => {
    ChannelResource.fetchModel.mockResolvedValue(installedPublishedChannel);
    RemoteChannelResource.fetchModel.mockRejectedValue({ status: 404 });
    return expect(fetchChannelAtSource({ channel_id: 'published_channel' })).rejects.toBe(
      'CHANNEL_NOT_ON_STUDIO',
    );
  });

  it('non-draft channel: resolves with [installedChannel, studioChannel] when Studio responds', () => {
    const studioChannel = { id: 'published_channel', version: 7 };
    ChannelResource.fetchModel.mockResolvedValue(installedPublishedChannel);
    RemoteChannelResource.fetchModel.mockResolvedValue(studioChannel);
    return fetchChannelAtSource({ channel_id: 'published_channel' }).then(([installed, source]) => {
      expect(installed).toEqual(installedPublishedChannel);
      expect(source).toEqual(studioChannel);
    });
  });
});
