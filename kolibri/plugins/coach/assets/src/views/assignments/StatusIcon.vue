<template>

  <span class="status-icon">
    <mat-svg
      v-if="active"
      category="image"
      name="lens"
      class="status-icon-active"
    />
    <mat-svg
      v-else
      category="image"
      name="lens"
      class="status-icon-inactive"
    />
    <span class="active-text">{{ text }}</span>
  </span>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'StatusIcon',
    props: {
      active: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        required: true,
        validator(value) {
          return [ContentNodeKinds.EXAM, ContentNodeKinds.LESSON].includes(value);
        },
      },
    },
    $trs: {
      // both forms are necessary for languages where adjective and noun must agree
      examActive: 'Active',
      examInactive: 'Inactive',
      lessonActive: 'Active',
      lessonInactive: 'Inactive',
    },
    computed: {
      text() {
        if (this.type === ContentNodeKinds.EXAM) {
          return this.active ? this.$tr('examActive') : this.$tr('examInactive');
        }
        return this.active ? this.$tr('lessonActive') : this.$tr('lessonInactive');
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .status-icon {
    vertical-align: middle;
  }

  .status-icon-active,
  .status-icon-inactive {
    vertical-align: middle;
  }

  .status-icon-active {
    fill: $core-status-correct;
  }

  .status-icon-inactive {
    fill: $core-grey;
  }

  .active-text {
    margin-left: 8px;
    vertical-align: inherit;
  }

</style>
