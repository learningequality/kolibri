<template>

  <div>

    <section>
      <h1>
        {{ $tr('versionIsAvailable', { channelName, nextVersion }) }}
      </h1>
      <p> {{ $tr('youAreCurrentlyOnVersion', { currentVersion }) }}</p>
      <p v-if="channelIsIncomplete">
        {{ $tr('channelIsIncomplete', { available, total }) }}
      </p>
    </section>

    <section>
      <h3>{{ $tr('versionChangesHeader', { currentVersion, nextVersion }) }}</h3>
      <KTooltip>
        {{ $tr('resourcesToBeDeletedTooltip') }}
      </KTooltip>

      <table>
        <tr>
          <th>{{ $tr('resourcesAvailableForImport') }}</th>
          <td></td>
        </tr>
        <tr>
          <th>{{ $tr('resourcesToBeDeleted') }}</th>
          <td></td>
        </tr>
        <tr>
          <th>{{ $tr('resourcesToBeUpdated') }}</th>
          <td></td>
        </tr>
      </table>

      <KButton
        :text="$tr('updateChannelAction')"
        appearance="raised-button"
        :primary="true"
      />
    </section>

    <section dir="auto">
      <template v-for="(info, idx) in versionInfos">
        <h2 :key="idx">
          {{ $tr('versionNumberHeader', { version: info.version }) }}
        </h2>
        <p :key="idx">
          {{ info.description }}
        </p>
      </template>
    </section>

    <KModal
      v-if="showModal"
      :title="$tr('updateChannelAction')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @submit="handleSubmit"
      @cancel="showModal = false"
    >
      <p>{{ $tr('updateConfirmationQuestion', { version: nextVersion }) }}</p>
    </KModal>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'NewChannelVersionPage',
    components: {},
    mixins: [commonCoreStrings],
    props: {},
    data() {
      return {
        showModal: false,
      };
    },
    computed: {
      channelIsIncomplete() {
        return false;
      },
    },
    methods: {
      handleSubmit() {
        // Create the import channel task
        // Redirect to the MANAGE_CONTENT_PAGE
      },
    },
    $trs: {
      versionIsAvailable: `Version {nextVersion} of '{channelName}' is available`,
      youAreCurrentlyOnVersion: 'You are currently on version {currentVersion}',
      versionChangesHeader: {
        message: 'Changes if you choose to update from version {currentVersion} to {nextVersion}',
        context:
          'Header above a table that lists what the consequences of updating the channel would be',
      },
      resourcesAvailableForImport: {
        message: 'New resources available',
        context:
          'Label associated with the number of resources that would become available for importing if the channel is updated',
      },
      resourcesToBeDeleted: {
        message: 'Resources that will be deleted',
        context:
          'Label associated with the number of resources that would be deleted if the channel is updated',
      },
      resourcesToBeDeletedTooltip: {
        message:
          'When you update this channel, some resources will be deleted. This may affect lessons or quizzes that are using the deleted resources',
        context: 'Warning about the effects of updating the channel',
      },
      resourcesToBeUpdated: {
        message: 'Resources to be updated',
        context: 'Label associated with the number of resources would be updated',
      },
      updateChannelAction: 'Update channel',
      versionNumberHeader: 'Version {version}',
      updateConfirmationQuestion: `Are you sure you want to update '{channelName}' to version {version}?`,
      channelIsIncomplete: {
        message:
          'This copy of the channel is incomplete. It contains {available} of {total} resources from the original channel',
        context:
          'Warning indicating that the source does not have all content from the original channel',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
