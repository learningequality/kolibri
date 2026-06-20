<template>

  <img
    v-if="qrDataUrl"
    class="user-qr-code"
    :src="qrDataUrl"
    :alt="altText"
    :style="imgStyle"
  />
  <KCircularLoader
    v-else
    :delay="false"
  />

</template>


<script>

  import { ref, watch, onMounted } from 'vue';
  import QRCode from 'qrcode';
  import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';

  /**
   * Renders a QR code for a learner's `qr_login_token`. Used on the profile page
   * and on printable credential cards. The token is generated server-side and
   * stored in plaintext on `FacilityUser` (mirroring `picture_password`).
   */
  export default {
    name: 'UserQRCode',
    components: { KCircularLoader },
    props: {
      /**
       * The plaintext QR token (typically `FacilityUser.qr_login_token`).
       */
      token: {
        type: String,
        required: true,
      },
      /**
       * Pixel size of the rendered QR code. Defaults to 160 (suitable for an
       * inline profile display). Pass a larger value (e.g. 240) for print cards.
       */
      size: {
        type: Number,
        default: 160,
      },
      /**
       * Optional CSS margin override.
       */
      margin: {
        type: Number,
        default: 0,
      },
    },
    setup(props) {
      const qrDataUrl = ref('');
      const { myQRCode$ } = qrLoginStrings;

      async function generate() {
        if (!props.token) {
          qrDataUrl.value = '';
          return;
        }
        try {
          qrDataUrl.value = await QRCode.toDataURL(props.token, {
            margin: props.margin,
            width: props.size,
            errorCorrectionLevel: 'M',
          });
        } catch (err) {
          // qrcode lib is synchronous-ish and very stable; failure here would
          // only happen on truly malformed input. Leave the loader spinning so
          // the user sees something rather than a broken image.
          qrDataUrl.value = '';
        }
      }

      onMounted(generate);
      watch(() => [props.token, props.size, props.margin], generate);

      return {
        qrDataUrl,
        altText: myQRCode$(),
      };
    },
    computed: {
      imgStyle() {
        return {
          width: this.size + 'px',
          height: this.size + 'px',
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .user-qr-code {
    display: block;
    image-rendering: pixelated;
  }

</style>
