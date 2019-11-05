<template>

  <KModal
    :title="$tr('registerFacility')"
    :cancelText="$tr('close')"
    @cancel="closeModal"
  >
    {{ $tr('alreadyRegistered', {name: projectName}) }}

  </KModal>

</template>


<script>

  import { mapState } from 'vuex';

  export default {
    name: 'AlreadyRegisteredModal',
    computed: {
      ...mapState('manageSync', ['projectName']),
    },
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
    },
    $trs: {
      registerFacility: 'Register facility',
      alreadyRegistered: 'Already registered with `{name}`',
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>
