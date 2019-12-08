<template>

  <div
    class="new-version-banner"
    :style="{backgroundColor: $themePalette.lightblue.v_100}"
  >
    <!-- stubs -->
    <template v-if="false">
      <UpdateChannelModal />
      <NewChannelVersionPage />
      {{ strings }}
    </template>
    <!-- end stubs -->
    <span class="version">
      <KIcon
        class="icon"
        icon="error"
        :style="{fill: $themePalette.lightblue.v_500}"
      />
      <span class="version-available">
        {{ $tr('versionAvailable', { version }) }}
      </span>
    </span>
    <KButton
      :text="$tr('viewChangesAction')"
      appearance="flat-button"
      :primary="false"
      @click="$emit('click')"
    />
  </div>

</template>


<script>

  import channelUpdateStrings from './channelUpdateStrings.js';
  import UpdateChannelModal from './UpdateChannelModal';
  import NewChannelVersionPage from './NewChannelVersionPage';

  export default {
    name: 'NewChannelVersionBanner',
    components: {
      UpdateChannelModal,
      NewChannelVersionPage,
    },
    props: {
      version: {
        type: Number,
        required: true,
      },
    },
    computed: {
      // Stubbed out
      strings() {
        return channelUpdateStrings;
      },
    },
    $trs: {
      versionAvailable: {
        message: 'Version {version} is available',
        context:
          '\nWhen a new version of the channel is available, this message alerts the user that they can update. ',
      },
      viewChangesAction: 'View changes',
    },
  };

</script>


<style lang="scss" scoped>

  .new-version-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 16px;
  }

  .version {
    display: flex;
    align-items: center;
    // Slight nudge to align with button text
    margin-bottom: 4px;
  }

  .icon {
    margin-right: 16px;
    margin-bottom: 4px;
  }

  svg.icon {
    width: 24px;
    height: 24px;
  }

</style>
