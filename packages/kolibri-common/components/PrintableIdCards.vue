<template>

  <div class="printable-id-cards">
    <div class="cards-grid">
      <div
        v-for="learner in learners"
        :key="learner.id"
        class="id-card"
      >
        <!-- Brand / school logo -->
        <div
          v-if="brandImage"
          class="card-brand"
        >
          <img
            :src="brandImage"
            alt=""
            class="brand-img"
          />
        </div>

        <!-- Learner photo -->
        <div class="card-photo-area">
          <img
            v-if="learner.profile_image"
            :src="learner.profile_image"
            :alt="learner.full_name"
            class="card-photo"
          />
          <div
            v-else
            class="card-photo-placeholder"
          >
            <span>{{ photoPlaceholder$() }}</span>
          </div>
        </div>

        <!-- Name -->
        <p class="card-name">{{ learner.full_name }}</p>

        <!-- QR code -->
        <div class="card-qr">
          <UserQRCode
            v-if="learner.qr_login_token"
            :token="learner.qr_login_token"
            :size="80"
          />
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import UserQRCode from 'kolibri-common/components/UserQRCode';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';

  export default {
    name: 'PrintableIdCards',
    components: { UserQRCode },
    setup() {
      const { photoPlaceholder$ } = qrLoginStrings;
      return { photoPlaceholder$ };
    },
    props: {
      learners: {
        type: Array,
        required: true,
      },
      brandImage: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .printable-id-cards {
    width: 100%;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 2in);
    grid-template-rows: auto;
    gap: 0.2in;
    justify-content: center;
  }

  .id-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.05in;
    width: 2in;
    height: 3in;
    padding: 0.1in;
    border: 1.5px solid #333;
    border-radius: 0.05in;
    overflow: hidden;
    box-sizing: border-box;
  }

  .card-brand {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 0.3in;
    flex-shrink: 0;
  }

  .brand-img {
    max-width: 100%;
    max-height: 0.3in;
    object-fit: contain;
  }

  .card-photo-area {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 0.9in;
    height: 0.9in;
    flex-shrink: 0;
    border-radius: 0.05in;
    overflow: hidden;
  }

  .card-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-photo-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: #f0f0f0;
    color: #999;
    font-size: 6pt;
  }

  .card-name {
    margin: 0;
    font-size: 8pt;
    font-weight: 600;
    text-align: center;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .card-qr {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .card-qr /deep/ img {
    width: 0.75in !important;
    height: 0.75in !important;
  }

  // No screen-hiding rule needed — the parent (IdCardsPage) controls
  // visibility via v-if and the @media print visibility trick.

  @media print {
    .id-card {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }

</style>
