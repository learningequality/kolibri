<template>

  <!--
    Rendered indirectly: GapMatchInteraction reads the gap choices out of its
    slot and renders their content as chips in the response pool, so this
    component is not mounted on its own. It still has to be a registered
    component, or DOMPurify drops the element and the choice content with it.
  -->
  <span
    class="qti-gap-text"
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
    name: 'GapText',
    tag: 'qti-gap-text',
    setup() {
      return {};
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      identifier: QTIIdentifierProp(true),
      fixed: BooleanProp(false, false),
      matchMax: NonNegativeIntProp(false, 1),
      matchMin: NonNegativeIntProp(false, 0),
      // A space-separated list of the identifiers this choice may be matched
      // with. Empty means it may go in any gap.
      matchGroup: StringProp(false),
      /* eslint-enable */
    },
  };

</script>
