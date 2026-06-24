<template>

  <div>
    <KModal
      :title="title"
      :submitText="printCard$()"
      :cancelText="closeAction$()"
      @submit="printCard"
      @cancel="$emit('close')"
    >
      <div
        v-if="loading"
        class="modal-loader"
      >
        <KCircularLoader :delay="false" />
      </div>
      <div
        v-else-if="user"
        class="modal-body"
      >
        <StudentIdCard
          :learner="user"
          :selectable="false"
          @refresh="onRefresh"
          @error="onError"
        />
      </div>
    </KModal>

    <!-- Print overlay (visible only during printing) -->
    <div
      v-if="printing && user"
      class="id-card-print-overlay"
    >
      <PrintableIdCards
        :learners="[user]"
        :brandImage="cardBrandImage"
      />
    </div>
  </div>

</template>


<script>

  import { computed, onMounted, ref } from 'vue';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import StudentIdCard from 'kolibri-common/components/StudentIdCard';
  import PrintableIdCards from 'kolibri-common/components/PrintableIdCards';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';

  export default {
    name: 'UserIdCardModal',
    components: { StudentIdCard, PrintableIdCards },
    setup(props, { emit }) {
      const { createSnackbar } = useSnackbar();
      const { facilityConfig } = useFacility();
      const { printCard$, idCardLabel$, couldNotLoadIdCard$ } = qrLoginStrings;
      const { closeAction$ } = coreStrings;

      const user = ref(null);
      const loading = ref(true);
      const printing = ref(false);

      const cardBrandImage = computed(
        () => facilityConfig.value?.extra_fields?.card_brand_image || null,
      );

      const title = computed(() => user.value?.full_name || idCardLabel$());

      onMounted(async () => {
        try {
          user.value = await FacilityUserResource.fetchModel({
            id: props.userId,
          });
        } catch (err) {
          createSnackbar({ text: couldNotLoadIdCard$(), autoDismiss: true });
          emit('close');
        } finally {
          loading.value = false;
        }
      });

      function onRefresh(updatedLearner) {
        if (user.value) {
          user.value = { ...user.value, ...updatedLearner };
        }
      }

      function onError(message) {
        createSnackbar({ text: message, autoDismiss: true });
      }

      function printCard() {
        printing.value = true;
        const done = () => {
          printing.value = false;
          window.removeEventListener('afterprint', done);
        };
        window.addEventListener('afterprint', done);
        setTimeout(() => window.print(), 400);
      }

      return {
        user,
        loading,
        printing,
        cardBrandImage,
        title,
        printCard,
        onRefresh,
        onError,
        printCard$,
        closeAction$,
      };
    },
    props: {
      userId: {
        type: String,
        required: true,
      },
    },
    emits: ['close'],
  };

</script>


<style lang="scss" scoped>

  .modal-loader {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .modal-body {
    display: flex;
    justify-content: center;
    padding: 8px;
  }

  .id-card-print-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    overflow: auto;
    background-color: white;
  }

</style>


<style>

  /*
   * Global (unscoped) print rules so only the ID card prints.
   * Mirrors the approach used by the ID Cards page.
   */
  @media print {
    body * {
      visibility: hidden;
    }

    .id-card-print-overlay,
    .id-card-print-overlay * {
      visibility: visible;
    }

    .id-card-print-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      background: white;
    }
  }

  @page {
    size: letter;
    margin: 0.5in;
  }

</style>
