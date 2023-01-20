<template>

  <div class="alert">
    <span class="closebtn" @click="closealert">&times;</span>
    <div style="display:flex">
      <div>
        <KIcon
          icon="error"
          class="icon"
        />
      </div>

      <div
        class="error-message"
      >
        {{ $tr('warningMessage') }}
        <KButton
          appearance="basic-link"
        >
          {{ $tr('alertLink') }}
        </KButton>
      </div>
    </div>


  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'GlobalSnackbar',
    components: {},
    mixins: [commonCoreStrings],
    data: function() {
      return {};
    },
    beforeMount() {},
    method: {
      closealert() {
        this.parentElement.style.display = 'none';
      },
    },
    $trs: {
      warningMessage: {
        message:
          'Some devices do not have enough storage for updates. Change the visibility of any active lessons and quizzes you aren’t using right now to free up space. ',
        context: 'Warning message.',
      },
      alertLink: {
        message: 'Manage lessons and quizzes',
        context: 'link text to the warning alert',
      },
    },
  };

</script>


<style scoped>
.alert {
  padding: 10px;
  background-color:  #FFEBEE; /* Red */
  color:#212121;
  margin-bottom: 15px;
}
.icon{
  font-size:25px;
}
.error-message{
  font-size:14px;
  margin-left:10px;
}
.closebtn {
  color: #616161;
  font-size:25px;
  cursor: pointer;
  float:right;
}
.closebtn:hover {
  color: black;
}
</style>
