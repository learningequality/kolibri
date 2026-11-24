<template>

  <div
    class="donation-banner"
    :class="{ stacked: windowIsSmall }"
  >
    <div class="text-column">
      <h2 class="banner-title">
        {{ TITLE }}
      </h2>
      <p
        v-for="paragraph in paragraphs"
        :key="paragraph"
        class="banner-message"
        data-testid="donation-paragraph"
      >
        {{ paragraph }}
      </p>
      <div class="actions">
        <KExternalLink
          :text="DONATE_LABEL"
          :href="donateHref"
          appearance="raised-button"
          :primary="true"
          :openInNewTab="true"
        />
        <KButton
          :text="DISMISS_LABEL"
          :aria-label="DISMISS_ARIA_LABEL"
          @click="$emit('dismiss')"
        />
      </div>
    </div>
    <img
      v-if="qrSrc && !windowIsSmall"
      :src="qrSrc"
      :alt="QR_ALT"
      class="qr-image"
      width="160"
      height="160"
    >
  </div>

</template>


<script>

  import { ref } from 'vue';
  import QRCode from 'qrcode';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export const TITLE = 'Support Kolibri';
  export const DONATE_LABEL = 'Donate';
  export const DISMISS_LABEL = 'Dismiss';
  export const DISMISS_ARIA_LABEL = 'Dismiss donation banner';
  export const QR_ALT = 'QR code for donation';
  const VARIANT_PARAGRAPHS = {
    a: [
      'Kolibri is free, open-source software created by Learning Equality, a nonprofit working to make learning accessible to everyone, everywhere, even without reliable internet access.',
      'More than 11 million people have used Kolibri around the world — people like you. Yet fewer than 1% of users financially support the work that keeps it free, open, and improving.',
      'If Kolibri has helped you, consider supporting the nonprofit behind it. Your contribution helps us continue building tools that make learning possible for communities often left behind.',
    ],
    b: [
      'You’re using Kolibri, free, open-source software built by Learning Equality, a nonprofit. We believe access to learning shouldn’t depend on an internet connection, a subscription, or a paywall.',
      'Keeping Kolibri free and improving takes funding. Today, fewer than 1% of Kolibri users financially support its development. If this tool has been useful to you, consider making a donation to help sustain it.',
    ],
  };

  export default {
    name: 'DonationBanner',
    setup(props) {
      const { windowIsSmall } = useKResponsiveWindow();
      const qrSrc = ref(null);

      const source = `kolibri-${__version}-banner-${props.notification.variant}`;
      const donateHref = `https://learningequality.org/donate/?source=${encodeURIComponent(source)}`;

      QRCode.toDataURL(donateHref, { margin: 1, width: 320 }).then(src => {
        qrSrc.value = src;
      });

      return {
        qrSrc,
        windowIsSmall,
        donateHref,
        paragraphs: VARIANT_PARAGRAPHS[props.notification.variant],
        TITLE,
        DONATE_LABEL,
        DISMISS_LABEL,
        DISMISS_ARIA_LABEL,
        QR_ALT,
      };
    },
    props: {
      notification: {
        type: Object,
        required: true,
      },
    },
    emits: ['dismiss'],
  };

</script>


<style lang="scss" scoped>

  .donation-banner {
    display: flex;
    gap: 48px;
    align-items: stretch;
    padding: 16px;
    margin: 8px 0;
    background-color: var(--palette-blue-v100);
    border-radius: 8px;
  }

  .donation-banner.stacked {
    flex-direction: column;
    gap: 16px;
  }

  .banner-title {
    margin: 0;
    font-size: 16px;
  }

  .banner-message {
    margin: 0;
  }

  .text-column {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: auto;
  }

  .qr-image {
    flex-shrink: 0;
  }

</style>
