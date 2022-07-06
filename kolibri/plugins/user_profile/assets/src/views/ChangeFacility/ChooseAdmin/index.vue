<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <p>{{ $tr('description') }}</p>

    <BottomAppBar>
      <slot name="buttons">
        <KButtonGroup>
          <KButton
            :primary="false"
            :text="coreString('backAction')"
            appearance="flat-button"
            data-test="backButton"
            @click="sendBack"
          />
          <KButton
            :primary="true"
            :text="coreString('continueAction')"
            data-test="continueButton"
            @click="sendContinue"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>
  </div>

</template>


<script>

  import { inject } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';

  export default {
    name: 'ChooseAdmin',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { BottomAppBar },
    mixins: [commonCoreStrings],
    setup() {
      const changeFacilityService = inject('changeFacilityService');

      function sendContinue() {
        changeFacilityService.send({ type: 'CONTINUE' });
      }
      function sendBack() {
        changeFacilityService.send({ type: 'BACK' });
      }

      return {
        sendContinue,
        sendBack,
      };
    },
    $trs: {
      documentTitle: {
        message: 'Choose a new super admin',
        context:
          'Title of the step for choosing a new super admin in a source facility when a user changing facilities is the only super admin of the source facility.',
      },
      description: {
        message: 'Choose an account to manage channels and accounts.',
        context:
          'Description of the step for choosing a new super admin in a source facility when a user changing facilities is the only super admin of the source facility.',
      },
    },
  };

</script>
