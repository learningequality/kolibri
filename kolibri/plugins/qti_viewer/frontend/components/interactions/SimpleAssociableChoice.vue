<template>

  <span
    class="qti-simple-associable-choice"
    dir="auto"
  ><slot></slot></span>

</template>


<script>

  import {
    BooleanProp,
    NonNegativeIntProp,
    QTIIdentifierProp,
    StringProp,
  } from '../../utils/props';

  export default {
    name: 'SimpleAssociableChoice',
    tag: 'qti-simple-associable-choice',
    setup() {
      return {};
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      identifier: QTIIdentifierProp(true),
      fixed: BooleanProp(false, false),
      matchMax: NonNegativeIntProp(false, 1),
      matchMin: NonNegativeIntProp(false, 0),
      matchGroup: StringProp(false),
      /* eslint-enable */
    },
  };

</script>
