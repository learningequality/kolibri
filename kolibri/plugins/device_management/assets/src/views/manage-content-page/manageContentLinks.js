import { ContentWizardPages } from '../../constants';

export function selectContentTopicLink(topicNode) {
  return {
    name: ContentWizardPages.SELECT_CONTENT_TOPIC,
    params: {
      // TODO utilize id exclusively in import/export code
      node_id: topicNode.id || topicNode.pk,
      node: topicNode,
    },
  };
}

export function availableChannelsPageLink(params = {}) {
  const { driveId, forExport } = params;
  return {
    name: ContentWizardPages.AVAILABLE_CHANNELS,
    query: {
      drive_id: driveId,
      for_export: forExport,
    },
  };
}

export function selectContentPageLink(params = {}) {
  const { channelId, driveId, forExport } = params;
  return {
    name: ContentWizardPages.SELECT_CONTENT,
    params: {
      channel_id: channelId,
    },
    query: {
      drive_id: driveId,
      for_export: forExport,
    },
  };
}
