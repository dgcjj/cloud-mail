<template>
  <emailScroll type="star" ref="scroll"
               :allow-star="false"
               :cancel-success="cancelStar"
               :getEmailList="getEmailList"
               :emailDelete="emailDelete"
               :star-add="starAdd"
               :star-cancel="starCancel"
               @jump="jumpContent"
               actionLeft="6px"
               :show-account-icon="false"
  >
    <template #first>
      <moveFolder v-if="hasSelected" :get-email-ids="selectedIds" :size="20"/>
    </template>
  </emailScroll>
</template>

<script setup>
import emailScroll from "@/components/email-scroll/index.vue"
import {emailDelete} from "@/request/email.js";
import {starAdd, starCancel, starList} from "@/request/star.js";
import {useEmailStore} from "@/store/email.js";
import {computed, defineOptions, onMounted, ref} from "vue";
import moveFolder from "@/components/move-folder/index.vue";
import router from "@/router/index.js";

defineOptions({
  name: 'star'
})

const scroll = ref({})

//"移到文件夹"按钮：勾选了邮件才显示
const hasSelected = computed(() => !!scroll.value?.emailList?.some(item => item.checked))
function selectedIds() {
  return scroll.value.emailList.filter(item => item.checked).map(item => item.emailId)
}
const emailStore = useEmailStore();

function jumpContent(email) {
  emailStore.contentData.email = emailStore.toContentEmail(email)
  emailStore.contentData.delType = 'logic'
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  router.push({name: 'content', params: {mailbox: 'starred'}})
}

function getEmailList(emailId, size) {
  return emailStore.fetchList(full => starList(emailId, size, full))
}

function cancelStar(email) {
  emailStore.cancelStarEmailId = email.emailId
  scroll.value.deleteEmail([email.emailId])
}

onMounted(() => {
  emailStore.starScroll = scroll
})

</script>
