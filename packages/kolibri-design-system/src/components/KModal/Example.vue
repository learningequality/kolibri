<template>

  <div>
    <KModal
      v-if="modalShown === 'props'"
      title="Modal with props for actions"
      submitText="save"
      cancelText="cancel"
      @submit="modalShown = null"
      @cancel="modalShown = null"
    >
      <p>This is the content section of the modal.</p>
    </KModal>
    <p>
      Uses props for actions:
    </p>
    <p>
      <KButton
        text="Open modal"
        @click="modalShown = 'props'"
      />
    </p>

    <KModal
      v-if="modalShown === 'slot'"
      title="Modal with slot for actions"
      submitText="save"
      cancelText="cancel"
      @submit="modalShown = null"
      @cancel="modalShown = null"
    >
      <p>This is the content section of the modal.</p>
      <KButton
        slot="actions"
        type="submit"
        :primary="true"
        text="CUstom button"
      />
    </KModal>
    <p>
      Uses slot for actions:
    </p>
    <p>
      <KButton
        text="Open modal"
        @click="modalShown = 'slot'"
      />
    </p>
  </div>

</template>


<script>

  import KModal from 'kolibri-components/src/KModal';

  export default {
    name: 'Example',
    components: { KModal },
    data: () => ({
      modalShown: null,
    }),
  };

</script>
