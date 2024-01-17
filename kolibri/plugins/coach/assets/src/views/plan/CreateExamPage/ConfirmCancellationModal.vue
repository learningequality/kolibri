<template>
  <div>
    <KModal
      title="Are you sure you want to exit ?"
    >
      <p>All the changes made on selected resource will be lost</p>

      <template #actions>
        <KGrid>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <KButton
              :text="coreString('cancelAction')"
              class="kbuttons"
              style="width:100%;"
              @click="closeModal()"
            />
          </KGridItem>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <KButton
              :text="coreString('continueAction')"
              appearance="raised-button"
              style="width:100%;"
              primary
            />
          </KGridItem>
        </KGrid>
      </template>
    </KModal>
  </div>
</template>
<script>

import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

export default {
    name:"ConfirmCancellationModal",
    mixins: [commonCoreStrings],
    methods: {
        closeModal() {
            this.$emit('cancel');
        },
    },
}
</script>
