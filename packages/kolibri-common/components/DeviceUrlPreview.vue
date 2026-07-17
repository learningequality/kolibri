<template>

  <p
    class="url-preview"
    :style="{ color: $themeTokens.annotation }"
  >
    {{ previewText }}
  </p>

</template>


<script>

  import { computed, watch } from 'vue';
  import { createTranslator } from 'kolibri/utils/i18n';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import { deviceLocalUrl, baseDeviceUrl } from 'kolibri-common/utils/deviceUrl';

  const previewStrings = createTranslator('DeviceUrlPreview', {
    reachableAtUrl: {
      message: 'This device will be reachable at {url}',
      context:
        'Live preview of the .local web address the device name produces. {url} is e.g. http://tonyslaptop.local:8080',
    },
    noCustomAddress: {
      message:
        'This name doesn’t produce a custom web address, but this device will still be reachable at {url} and its IP address.',
      context:
        'Shown when the entered name has no letters or numbers, so no custom .local address can be created. {url} is the bare base address, e.g. http://kolibri.local:8080',
    },
  });

  export default {
    name: 'DeviceUrlPreview',
    setup(props) {
      const { reachableAtUrl$, noCustomAddress$ } = previewStrings;
      const { sendPoliteMessage } = useKLiveRegion();
      const previewText = computed(() => {
        if (!props.deviceName.trim()) {
          return ''; // pristine field — no message (see empty-input decision)
        }
        const port = window.location.port;
        const url = deviceLocalUrl(props.deviceName, port);
        if (!url) {
          // typed name yields no slug — fall back to the bare base address
          return noCustomAddress$({ url: baseDeviceUrl(port) });
        }
        return reachableAtUrl$({ url });
      });
      watch(previewText, message => {
        if (message) {
          sendPoliteMessage(message);
        }
      });
      return { previewText };
    },
    props: {
      deviceName: {
        type: String,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .url-preview {
    margin-top: 0;
    font-size: 12px;
    // The previewed .local URL is a single unbreakable token; allow it to wrap
    // so long device-name slugs don't overflow the container on narrow screens.
    overflow-wrap: break-word;
  }

</style>
