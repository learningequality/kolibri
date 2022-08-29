<template>

  <span
    v-if="typeDisplay"
    class="user-type-display"
  >
    {{ typeDisplay }}
  </span>

</template>


<script>

  import translatedUserKinds from 'kolibri.coreVue.mixins.translatedUserKinds';

  export default {
    name: 'UserTypeDisplay',
    mixins: [translatedUserKinds],
    props: {
      userType: {
        type: String,
        default: null,
      },
    },
    computed: {
      typeDisplay() {
        if (this.userType) {
          return this.typeDisplayMap[this.userType];
        }
        return '';
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      /*
        Translation should not be removed as it's being used
        by the crossComponentTranslator in the userKinds mixin
      */
      superUserLabel: {
        message: 'Super admin',
        context:
          'An account type that can manage the device. Super admin accounts also have permission to do everything that admins, coaches, and learners can do.',
      },
      /* eslint-enable */
    },
  };

</script>


<style lang="scss" scoped></style>
