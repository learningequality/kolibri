<template>

  <div>

    <section>
      <h1>
        {{ $tr('versionIsAvailable', { channelName, nextVersion }) }}
      </h1>
      <p> {{ $tr('youAreCurrentlyOnVersion', { currentVersion }) }}</p>
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
      :title="$tr('modalTitle')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @submit="handleSubmit"
      @cancel="showModal = false"
    >
      <p>{{ $tr('modalQuestion', { version: nextVersion }) }}</p>
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
    computed: {},
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
        'Warning! When you update this channel, some resources will be deleted. This may affect lessons or quizzes that are using the deleted resources.',
      resourcesToBeUpdated: 'Resources to be updated:',
      updateChannelAction: 'Update channel',
      versionNumberHeader: 'Version {version}',
      modalTitle: 'Update version',
      modalQuestion: 'Are you sure you want to update to version {version}?',
    },
  };

</script>


<style lang="scss" scoped></style>
