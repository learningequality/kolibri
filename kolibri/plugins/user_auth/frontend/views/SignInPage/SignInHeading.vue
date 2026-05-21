<template>

  <div
    v-if="showPasswordForm"
    class="sign-in-text"
  >
    {{ userString('signingInAsUserLabel', { user: username }) }}
  </div>

</template>


<script>

  import commonUserStrings from '../commonUserStrings';

  export default {
    name: 'SignInHeading',
    mixins: [commonUserStrings],
    props: {
      showPasswordForm: {
        type: Boolean,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .sign-in-text {
    margin-bottom: 20px;
    text-align: left;
  }

</style>
