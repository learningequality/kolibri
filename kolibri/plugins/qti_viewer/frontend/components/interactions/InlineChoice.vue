<template>

  <!--
    Rendered indirectly: the parent InlineChoiceInteraction reads these vnodes to
    build its dropdown options, so this component is not mounted on its own. This
    stateful (non-functional) definition is required so the parent can read
    `componentOptions.propsData`/`children` off each choice vnode, and so DOMPurify
    keeps the tag and its text content when sanitizing the item body.
  -->
  <span
    class="qti-inline-choice"
    dir="auto"
  ><slot></slot></span>

</template>


<script>

  import { BooleanProp, QTIIdentifierProp } from '../../utils/props';

  export default {
    name: 'InlineChoice',
    tag: 'qti-inline-choice',
    setup() {
      return {};
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      identifier: QTIIdentifierProp(true),
      fixed: BooleanProp(false, false),
      /* eslint-enable */
    },
  };

</script>
