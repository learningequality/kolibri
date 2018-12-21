<template>

  <span>{{ assignment }}</span>

</template>


<script>

  export default {
    name: 'Recipients',
    components: {},
    props: {
      groups: {
        type: Array,
        required: true,
      },
    },
    computed: {
      assignment() {
        if (!this.groups.length) {
          return this.$tr('assignmentClass');
        }
        return this.$tr('assignmentGroup', { count: this.groups.length });
      },
    },
    $trs: {
      assignmentClass: 'Entire class',
      assignmentGroup: '{count, number, integer} {count, plural, one {group} other {groups}}',
    },
  };

</script>


<style lang="scss" scoped></style>
