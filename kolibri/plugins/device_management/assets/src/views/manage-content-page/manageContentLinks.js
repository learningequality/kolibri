import { ContentWizardPages, PageNames } from '../../constants';

export function selectContentTopicLink(topicNode) {
  return {
    name: ContentWizardPages.SELECT_CONTENT_TOPIC,
    params: {
      node_id: topicNode.id,
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

export function manageContentPageLink() {
  return {
    name: PageNames.MANAGE_CONTENT_PAGE,
  };
}
