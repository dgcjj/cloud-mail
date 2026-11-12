<template>
  <emailScroll ref="scroll"
               :key="folderId"
               :cancel-success="cancelStar"
               :star-success="addStar"
               :getEmailList="getEmailList"
               :emailDelete="emailDelete"
               :star-add="starAdd"
               :star-cancel="starCancel"
               :email-read="emailRead"
               :show-unread="true"
               actionLeft="4px"
               :show-account-icon="false"
               @jump="jumpContent"
  >
    <template #first>
      <moveFolder v-if="hasSelected" :get-email-ids="selectedIds" :current-folder-id="folderId" :size="20"/>
    </template>
  </emailScroll>
</template>

<script setup>
//自定义文件夹里的邮件列表
import emailScroll from "@/components/email-scroll/index.vue"
import moveFolder from "@/components/move-folder/index.vue"
import {emailDelete, emailRead} from "@/request/email.js";
import {starAdd, starCancel} from "@/request/star.js";
import {folderEmails} from "@/request/folder.js";
import {useEmailStore} from "@/store/email.js";
import {useFolderStore} from "@/store/folder.js";
import {computed, defineOptions, onActivated, onMounted, ref, watch} from "vue";
import {useRoute} from "vue-router";
import router from "@/router/index.js";

defineOptions({
  name: 'folder'
})

const route = useRoute()
const emailStore = useEmailStore()
const folderStore = useFolderStore()
const scroll = ref({})
//页面被 keep-alive 缓存，离开后路由里没有 folderId，只在当前就是文件夹页时才更新，
//否则列表会因 key 变成 0 而重建并请求不存在的文件夹
const folderId = ref(Number(route.params.folderId) || 0)
watch(() => [route.name, route.params.folderId], ([name, id]) => {
  if (name === 'folder' && Number(id)) folderId.value = Number(id)
})
let loadedVersion = folderStore.version

const hasSelected = computed(() => !!scroll.value?.emailList?.some(item => item.checked))

function selectedIds() {
  return scroll.value.emailList.filter(item => item.checked).map(item => item.emailId)
}

//切换文件夹时列表组件会因 key 变化重建，这里只需要处理"别处移入了邮件"的情况
onActivated(() => {
  folderStore.folderScroll = scroll
  if (loadedVersion !== folderStore.version) {
    loadedVersion = folderStore.version
    scroll.value?.refreshList?.()
  }
})

onMounted(() => {
  folderStore.folderScroll = scroll
})

function jumpContent(email) {
  emailStore.contentData.email = emailStore.toContentEmail(email)
  emailStore.contentData.delType = 'logic'
  emailStore.contentData.showUnread = email.type === 0
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  emailStore.contentData.folderId = folderId.value
  router.push({name: 'content', params: {mailbox: 'folder'}})
}

function addStar(email) {
  emailStore.starScroll?.addItem(email)
}

function cancelStar(email) {
  emailStore.starScroll?.deleteEmail([email.emailId])
}

function getEmailList(emailId, size) {
  const id = folderId.value
  loadedVersion = folderStore.version
  if (!id) return Promise.resolve({list: [], total: 0, latestEmail: {emailId: 0}})
  return emailStore.fetchList(full => folderEmails(id, emailId, size, full)).then(data => {
    data.latestEmail = {emailId: 0}
    return data
  })
}
</script>
