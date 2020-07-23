<template>

  <div>
    <span class="version">
      <KIcon
        class="icon"
        icon="error"
        :style="{ fill: $themePalette.lightblue.v_500 }"
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

  export default {
    name: 'NewChannelVersionBanner',
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
          '\nWhen a new version of the channel is available, this message alerts the user that they can update. ',
      },
      viewChangesAction: 'View changes',
    },
  };

</script>


<style lang="scss" scoped>

  .version-available {
    margin-right: 8px;
  }

  .icon {
    position: relative;
    top: 6px;
    margin-right: 8px;
  }

  svg.icon {
    width: 24px;
    height: 24px;
  }

</style>
