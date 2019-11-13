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
      versionChangesHeader: 'Changes if you update from version {currentVersion} to {nextVersion}',
      resourcesAvailableForImport: 'New resources available:',
      resourcesToBeDeleted: 'Resources that will be deleted:',
      resourcesToBeDeletedTooltip:
        'When you update this channel, some resources will be deleted. This may affect lessons or quizzes that are using the deleted resources.',
      resourcesToBeUpdated: 'Resources to be updated:',
      updateChannelAction: 'Update channel',
      versionNumberHeader: 'Version {version}',
      updateConfirmationQuestion: `Are you sure you want to update '{channelName}' to version {version}?`,
      channelIsIncomplete:
        'This channel source is incomplete. It has {available} of {total} resources',
    },
  };

</script>


<style lang="scss" scoped></style>
