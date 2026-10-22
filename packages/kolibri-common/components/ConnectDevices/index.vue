<template>

  <div class="connect-devices">
    <template v-if="!hasFetched">
      <p
        v-if="fetchFailed"
        role="alert"
      >
        {{ fetchError$() }}
      </p>
      <KCircularLoader v-else />
    </template>
    <p
      v-else-if="!hasUrls"
      data-testid="no-network-notice"
    >
      {{ noNetwork$() }}
    </p>
    <template v-else>
      <section
        v-if="qrUrl"
        aria-labelledby="connect-devices-scan-heading"
      >
        <h2 id="connect-devices-scan-heading">{{ scanHeading$() }}</h2>
        <figure class="qr">
          <img
            v-if="qrSrc"
            :src="qrSrc"
            :alt="qrAlt$()"
            class="qr-image"
            width="200"
            height="200"
          >
          <figcaption class="qr-url">
            <span
              data-testid="qr-url"
              dir="ltr"
            >{{ qrUrl }}</span>
          </figcaption>
        </figure>
      </section>
      <section
        v-if="hostnameUrls.length"
        aria-labelledby="connect-devices-bookmark-heading"
      >
        <h2 id="connect-devices-bookmark-heading">{{ bookmarkHeading$() }}</h2>
        <ul class="url-list">
          <li
            v-for="url in hostnameUrls"
            :key="url"
          >
            <KExternalLink
              class="url-link"
              :text="url"
              :href="url"
              :openInNewTab="true"
              appearance="basic-link"
              dir="ltr"
            />
          </li>
        </ul>
      </section>
      <section
        v-if="ipUrls.length"
        aria-labelledby="connect-devices-ip-heading"
      >
        <h2 id="connect-devices-ip-heading">{{ ipHeading$() }}</h2>
        <ul class="url-list">
          <li
            v-for="url in ipUrls"
            :key="url"
          >
            <KExternalLink
              class="url-link"
              :text="url"
              :href="url"
              :openInNewTab="true"
              appearance="basic-link"
              dir="ltr"
            />
          </li>
        </ul>
      </section>
    </template>
  </div>

</template>


<script>

  import { computedAsync } from '@vueuse/core';
  import QRCode from 'qrcode';
  import { connectDevicesStrings } from 'kolibri-common/strings/connectDevicesStrings';
  import useConnectionUrls from './useConnectionUrls';

  export default {
    name: 'ConnectDevices',
    setup() {
      const { hasFetched, fetchFailed, hasUrls, hostnameUrls, ipUrls, qrUrl } = useConnectionUrls();
      const qrSrc = computedAsync(
        () => qrUrl.value && QRCode.toDataURL(qrUrl.value, { margin: 1, width: 400 }),
        null,
      );

      const { scanHeading$, qrAlt$, bookmarkHeading$, ipHeading$, noNetwork$, fetchError$ } =
        connectDevicesStrings;

      return {
        hasFetched,
        fetchFailed,
        hasUrls,
        hostnameUrls,
        ipUrls,
        qrUrl,
        qrSrc,
        scanHeading$,
        qrAlt$,
        bookmarkHeading$,
        ipHeading$,
        noNetwork$,
        fetchError$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .qr {
    margin: 0;
  }

  .qr-image {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .qr-url {
    margin-top: 8px;
    overflow-wrap: anywhere;
  }

  .url-list {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .url-link {
    max-width: 100%;

    /deep/ .link-text {
      min-width: 0;
      overflow-wrap: anywhere;
    }
  }

</style>
