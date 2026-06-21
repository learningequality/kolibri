<template>

  <div
    class="learner-qr-card"
    :style="cardStyle"
  >
    <div
      class="card-header"
      :style="{ borderColor: $themeTokens.fineLine }"
    >
      <div
        v-if="learner.profile_image"
        class="photo-wrapper"
      >
        <img
          :src="learner.profile_image"
          :alt="learner.full_name"
          class="learner-photo"
        />
      </div>
      <div
        v-else
        class="photo-placeholder"
        :style="{ borderColor: $themeTokens.fineLine }"
      >
        <span
          class="photo-placeholder-label"
          :style="{ color: $themeTokens.annotation }"
        >{{ photoPlaceholder$() }}</span>
      </div>
      <div class="name-block">
        <span
          dir="auto"
          class="learner-name"
          :style="{ color: $themeTokens.text }"
        >{{ learner.full_name }}</span>
        <span
          dir="auto"
          class="learner-username"
          :style="{ color: $themeTokens.annotation }"
        >{{ learner.username }}</span>
      </div>
    </div>

    <div class="qr-block">
      <UserQRCode
        v-if="learner.qr_login_token"
        :token="learner.qr_login_token"
        :size="qrSize"
        :margin="1"
      />
      <NoPasswordInfo v-else />
    </div>
  </div>

</template>


<script>

  import UserQRCode from 'kolibri-common/components/UserQRCode';
  import NoPasswordInfo from 'kolibri-common/components/NoPasswordInfo';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';

  /**
   * Printable credential card showing a learner's name, a placeholder for a physical
   * photo, and the QR code they can scan to sign in. Designed to be cut out and
   * handed to the learner. Mirrors the role of `LearnerPasswordCard` for the
   * picture-password flow.
   */
  export default {
    name: 'LearnerQRCard',
    components: { UserQRCode, NoPasswordInfo },
    props: {
      learner: {
        type: Object,
        required: true,
      },
      cardStyle: {
        type: Object,
        default: () => ({}),
      },
      /**
       * Pixel size of the QR code on the printed card. Defaults to 200.
       */
      qrSize: {
        type: Number,
        default: 200,
      },
    },
    setup() {
      const { photoPlaceholder$ } = qrLoginStrings;
      return { photoPlaceholder$ };
    },
  };

</script>


<style lang="scss" scoped>

  .learner-qr-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    border: 2px solid;
    border-radius: 8px;
  }

  .card-header {
    display: flex;
    gap: 16px;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid;
  }

  .photo-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    border: 2px dashed;
    border-radius: 8px;
  }

  .photo-wrapper {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
  }

  .learner-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .photo-placeholder-label {
    font-size: 12px;
    text-align: center;
  }

  .name-block {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .learner-name {
    padding-bottom: 4px;
    font-size: 18px;
    font-weight: 600;
    word-break: break-word;
  }

  .learner-username {
    font-size: 13px;
  }

  .qr-block {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media print {
    .learner-qr-card {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }

</style>
