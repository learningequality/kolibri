<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <p>{{ description }}</p>

    <BottomAppBar>
      <slot name="buttons">
        <KButtonGroup>
          <KButton
            :primary="false"
            :text="coreString('goBackAction')"
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

  import get from 'lodash/get';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';

  export default {
    name: 'CreateAccount',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { BottomAppBar },
    mixins: [commonCoreStrings],
    inject: ['changeFacilityService', 'state'],
    computed: {
      description() {
        return this.$tr('description', {
          targetFacility: get(this.state, 'value.targetFacility.name', ''),
        });
      },
    },
    methods: {
      sendContinue() {
        this.changeFacilityService.send({
          type: 'CONTINUE',
        });
      },
      sendBack() {
        this.changeFacilityService.send({
          type: 'BACK',
        });
      },
    },
    $trs: {
      documentTitle: {
        message: 'Create new account',
        context:
          'Title of the step for creating a new account in a target facility when changing facility.',
      },
      description: {
        message: 'New account for ‘{targetFacility}’ learning facility',
        context:
          'Shows above a new user form where a user can create a new account in a target facility when changing facility.',
      },
    },
  };

</script>
