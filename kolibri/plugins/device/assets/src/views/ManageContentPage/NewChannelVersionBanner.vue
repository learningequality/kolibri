<template>

  <div>
    <span class="version">
      <NewBadge
        :label="deviceString('newResourceLabel')"
        class="new-label"
      />

      <span class="version-available">
        {{ $tr('versionAvailable', { version }) }}
      </span>
    </span>
    <KButton
      :text="$tr('viewChangesAction')"
      appearance="basic-link"
      :primary="false"
      @click="$emit('click')"
    />
  </div>

</template>


<script>

  import commonDeviceStrings from '../commonDeviceStrings';
  import NewBadge from './NewBadge';

  export default {
    name: 'NewChannelVersionBanner',
    components: { NewBadge },
    mixins: [commonDeviceStrings],
    props: {
      version: {
        type: Number,
        required: true,
      },
    },
    $trs: {
      versionAvailable: {
        message: 'Version {version} is available',
        context:
          'When a new version of the channel is available, this message alerts the user that they can update. ',
      },
      viewChangesAction: {
        message: 'View changes',
        context:
          'Option to view what changes have been made in Kolibri when a new version is available.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .version-available {
    margin-right: 8px;
    font-weight: bold;
  }

  .new-label {
    display: inline-block;
    margin-right: 8px;
  }

</style>
