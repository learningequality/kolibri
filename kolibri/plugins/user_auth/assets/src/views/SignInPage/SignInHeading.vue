<template>

  <div class="sign-in-text">
    <div
      v-if="showFacilityName && !showPasswordForm"
      style="margin-top: 24px; margin-bottom: 16px; text-align: left"
    >
      {{ userString('signInToFacilityLabel', { facility: selectedFacility.name }) }}
    </div>

    <!-- Asking for password, has multiple facilities or is not informal -->
    <div
      v-else-if="showFacilityName && showPasswordForm"
      style="margin-top: 24px; margin-bottom: 16px; text-align: left"
    >
      {{
        userString('signingInToFacilityAsUserLabel', {
          facility: selectedFacility.name,
          user: username,
        })
      }}
    </div>

    <!-- Asking for password, has one facility which is informal -->
    <div v-else-if="showPasswordForm">
      {{ userString('signingInAsUserLabel', { user: username }) }}
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonUserStrings from '../commonUserStrings';

  export default {
    name: 'SignInHeading',
    mixins: [commonUserStrings],
    props: {
      showFacilityName: {
        type: Boolean,
        required: true,
      },
      showPasswordForm: {
        type: Boolean,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters(['selectedFacility']),
    },
  };

</script>


<style lang="scss" scoped>

  .sign-in-text {
    margin-top: 24px;
    margin-bottom: 16px;
    text-align: left;
  }

</style>
