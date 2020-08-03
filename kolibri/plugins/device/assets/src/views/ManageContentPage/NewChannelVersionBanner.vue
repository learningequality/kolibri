<template>

  <div>
    <span class="version">
      <span
        class="new-label"
        :style="{ color: $themeTokens.textInverted, backgroundColor: $themeTokens.success }"
      >
        {{ newString }}
      </span>

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

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import ChannelUpdateAnnotations from '../SelectContentPage/ChannelUpdateAnnotations';

  const UpdateStrings = crossComponentTranslator(ChannelUpdateAnnotations);

  export default {
    name: 'NewChannelVersionBanner',
    props: {
      version: {
        type: Number,
        required: true,
      },
    },
    computed: {
      newString() {
        // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
        return UpdateStrings.$tr('newResource');
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
    font-weight: bold;
  }

  .new-label {
    display: inline-block;
    padding: 2px 8px;
    margin-right: 8px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 2px;
  }

</style>
