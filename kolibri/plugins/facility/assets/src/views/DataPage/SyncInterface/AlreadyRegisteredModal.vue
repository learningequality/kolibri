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
      alreadyRegistered: {
        message: "Already registered with '{name}'",
        context:
          '\nOnce a facility has been registered on the Kolibri Data Portal, if admin makes a second attempt to register, Kolibri will reply with this reminder that the facility has already been registered with a project called {name}.',
      },
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>
