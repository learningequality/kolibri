<template>

  <div class="student-id-card">
    <!-- Interactive card (screen mode) -->
    <div
      class="card-body"
      :style="{ borderColor: $themeTokens.fineLine }"
    >
      <!-- Photo area -->
      <div class="photo-section">
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
          <KIcon
            icon="person"
            :color="$themeTokens.annotation"
            class="placeholder-icon"
          />
        </div>
        <KButton
          appearance="basic-link"
          :text="learner.profile_image ? replacePhoto$() : uploadPhoto$()"
          class="photo-action"
          @click="triggerFileInput"
        />
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          capture="user"
          class="hidden-input"
          @change="onFileSelected"
        />
      </div>

      <!-- Name + QR section -->
      <div class="info-section">
        <p
          class="learner-name"
          :style="{ color: $themeTokens.text }"
        >
          {{ learner.full_name }}
        </p>
        <p
          class="learner-username"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ learner.username }}
        </p>

        <div class="qr-section">
          <UserQRCode
            v-if="learner.qr_login_token"
            :token="learner.qr_login_token"
            :size="120"
          />
          <div
            v-else
            class="no-qr"
            :style="{ color: $themeTokens.annotation }"
          >
            <p class="no-qr-text">{{ noQrCodeAssigned$() }}</p>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="card-actions">
        <KButton
          v-if="learner.qr_login_token"
          appearance="basic-link"
          :text="printCard$()"
          @click="printCard"
        >
          <template #icon>
            <KIcon icon="print" />
          </template>
        </KButton>
        <KButton
          v-if="learner.qr_login_token"
          appearance="basic-link"
          :text="regenerateQR$()"
          @click="showRegenerateModal = true"
        >
          <template #icon>
            <KIcon icon="refresh" />
          </template>
        </KButton>
      </div>

      <!-- Loading overlay -->
      <div
        v-if="uploading || regenerating"
        class="loading-overlay"
      >
        <KCircularLoader :delay="false" />
      </div>
    </div>

    <!-- Regenerate confirmation modal -->
    <RegenerateQRModal
      v-if="showRegenerateModal"
      :learnerName="learner.full_name"
      @confirm="handleRegenerate"
      @cancel="showRegenerateModal = false"
    />

    <!-- Print layout (only visible during printing) -->
    <div
      v-if="printing"
      class="print-badge-layout"
    >
      <div class="badge">
        <div class="badge-photo-area">
          <img
            v-if="learner.profile_image"
            :src="learner.profile_image"
            :alt="learner.full_name"
            class="badge-photo"
          />
          <div
            v-else
            class="badge-photo-placeholder"
          >
            <span>{{ photoPlaceholder$() }}</span>
          </div>
        </div>
        <h1 class="badge-name">{{ learner.full_name }}</h1>
        <p class="badge-username">{{ learner.username }}</p>
        <div class="badge-qr">
          <UserQRCode
            v-if="learner.qr_login_token"
            :token="learner.qr_login_token"
            :size="200"
          />
        </div>
        <p
          v-if="facilityName"
          class="badge-facility"
        >{{ facilityName }}</p>
      </div>
    </div>
  </div>

</template>


<script>

  import { ref } from 'vue';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import UserQRCode from 'kolibri-common/components/UserQRCode';
  import RegenerateQRModal from 'kolibri-common/components/RegenerateQRModal';
  import KButton from 'kolibri-design-system/lib/buttons-and-links/KButton';
  import KIcon from 'kolibri-design-system/lib/KIcon';
  import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';

  const PHOTO_SIZE = 300;
  const PHOTO_QUALITY = 0.8;

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = PHOTO_SIZE;
        canvas.height = PHOTO_SIZE;
        const ctx = canvas.getContext('2d');
        const ratio = Math.max(PHOTO_SIZE / img.width, PHOTO_SIZE / img.height);
        const newW = img.width * ratio;
        const newH = img.height * ratio;
        const x = (PHOTO_SIZE - newW) / 2;
        const y = (PHOTO_SIZE - newH) / 2;
        ctx.drawImage(img, x, y, newW, newH);
        resolve(canvas.toDataURL('image/jpeg', PHOTO_QUALITY));
      };
      img.onerror = err => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }

  export default {
    name: 'StudentIdCard',
    components: { UserQRCode, RegenerateQRModal, KButton, KIcon, KCircularLoader },
    setup(props, { emit }) {
      const {
        uploadPhoto$,
        replacePhoto$,
        photoUploaded$,
        uploadFailed$,
        regenerateQR$,
        printCard$,
        noQrCodeAssigned$,
        photoPlaceholder$,
      } = qrLoginStrings;

      const fileInputRef = ref(null);
      const uploading = ref(false);
      const regenerating = ref(false);
      const printing = ref(false);
      const showRegenerateModal = ref(false);

      function triggerFileInput() {
        if (fileInputRef.value) fileInputRef.value.click();
      }

      async function onFileSelected(event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        uploading.value = true;
        try {
          const dataUrl = await resizeImage(file);
          await FacilityUserResource.saveModel({
            id: props.learner.id,
            data: { profile_image: dataUrl },
          });
          emit('refresh', { ...props.learner, profile_image: dataUrl });
        } catch (err) {
          emit('error', uploadFailed$());
        } finally {
          uploading.value = false;
        }
      }

      async function handleRegenerate() {
        showRegenerateModal.value = false;
        regenerating.value = true;
        try {
          const { data } = await FacilityUserResource.rotateQrToken(
            props.learner.id,
          );
          emit('refresh', { ...props.learner, qr_login_token: data.qr_login_token });
        } catch (err) {
          emit('error', uploadFailed$());
        } finally {
          regenerating.value = false;
        }
      }

      function printCard() {
        printing.value = true;
        const done = () => {
          printing.value = false;
          window.removeEventListener('afterprint', done);
        };
        window.addEventListener('afterprint', done);
        setTimeout(() => {
          window.print();
        }, 200);
      }

      return {
        fileInputRef,
        uploading,
        regenerating,
        printing,
        showRegenerateModal,
        triggerFileInput,
        onFileSelected,
        handleRegenerate,
        printCard,
        uploadPhoto$,
        replacePhoto$,
        photoUploaded$,
        uploadFailed$,
        regenerateQR$,
        printCard$,
        noQrCodeAssigned$,
        photoPlaceholder$,
      };
    },
    props: {
      learner: {
        type: Object,
        required: true,
      },
      facilityName: {
        type: String,
        default: '',
      },
    },
    emits: ['refresh', 'error'],
  };

</script>


<style lang="scss" scoped>

  .student-id-card {
    position: relative;
    width: 100%;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 2px solid;
    border-radius: 8px;
  }

  .photo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .photo-wrapper,
  .photo-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .photo-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed;
  }

  .placeholder-icon {
    width: 48px;
    height: 48px;
  }

  .learner-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .photo-action {
    font-size: 13px;
  }

  .hidden-input {
    display: none;
  }

  .info-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .learner-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .learner-username {
    margin: 0 0 8px;
    font-size: 13px;
  }

  .qr-section {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
  }

  .no-qr {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
  }

  .card-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: 8px;
  }

  // Print badge layout — full page school ID
  .print-badge-layout {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
  }

  .badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 48px;
    text-align: center;
  }

  .badge-photo-area {
    width: 200px;
    height: 200px;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid #ccc;
  }

  .badge-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .badge-photo-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #999;
    font-size: 18px;
    background-color: #f5f5f5;
  }

  .badge-name {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
  }

  .badge-username {
    margin: 0;
    font-size: 20px;
    color: #666;
  }

  .badge-facility {
    margin: 8px 0 0;
    font-size: 16px;
    color: #999;
  }

  // Screen mode: hide print layout
  @media screen {
    .print-badge-layout {
      display: none;
    }
  }

</style>
