<template>

  <KModal
    :title="$tr('createNewCustomChannelLabel')"
    :submitText="$tr('createChannelButtonLabel')"
    :cancelText="coreString('closeAction')"
    size="medium"
    
  >
  <p>dsifsduoif</p>
  </KModal>
</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'CreateNewCustomChannelModal',
    mixins: [commonCoreStrings],
    $trs: {
      createNewCustomChannelLabel: {
        message: 'Create a new custom channel',
        context: 'Title for create new custom channel modal',
      },
      createChannelButtonLabel: {
        message: 'create channel',
        context: 'Label for create channel submit button.',
      }
    }
  }

</script>


<style lang="scss" scoped></style>