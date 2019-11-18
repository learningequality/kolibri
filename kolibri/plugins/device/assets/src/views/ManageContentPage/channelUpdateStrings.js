import { createTranslator } from 'kolibri.utils.i18n';

export default createTranslator('ChannelUpdateStrings', {
  notAvailableFromDrives: 'This channel was not found on any attached drives',
  notAvailableFromNetwork: 'This channel was not found on other instances of Kolibri',
  notAvailableFromStudio: 'This channel was not found on Kolibri Studio',
  newVersionAvailableHeader: "Version {version} of '{channel}' is available",
  currentVersionLabel: 'You are currently on version {version}',
  changesHeader: {
    message: 'Changes if you update from version {oldVersion} to {newVersion}',
    context:
      'Header above a table that lists what the consequences of updating the channel would be',
  },
  newResourcesAvailableLabel: {
    message: 'New resources available',
    context:
      'Label associated with the number of resources that would become available for importing if the channel is updated',
  },
  resourcesDeletedLabel: {
    message: 'Resources that will be deleted',
    context:
      'Label associated with the number of resources that would be deleted if the channel is updated',
  },
  resourcesDeletedLabel: {
    message: 'Resources to be updated',
    context: 'Label associated with the number of resources would be updated',
  },
  updateChannelAction: 'Update channel',
  channelIncompleteWarning: {
    message:
      "This copy of '{channel}' is incomplete. It contains {resourcesInChannel} of {totalResources} resources from the original channel",
    context:
      'Warning indicating that the source does not have all content from the original channel',
  },
  updateWarning: {
    message:
      'When you update this channel, some resources will be deleted. This may affect lessons or quizzes that are using the deleted resources',
    context: 'Warning about the effects of updating the channel',
  },
  updateConfirmationHeader: {
    message: 'Update channel',
    context: 'Header for a confirmation of update',
  },
  updateConfirmationMessage: "Are you sure you want to update '{channel}' to version {version}?",
});
