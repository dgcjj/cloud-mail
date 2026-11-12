<template>
  <el-dropdown trigger="click" class="move-folder" @command="handleCommand" @visible-change="visibleChange">
    <Icon class="icon" icon="mdi:folder-move-outline" :width="size" :height="size" :title="$t('moveToFolder')"/>
    <template #dropdown>
      <el-dropdown-menu class="move-folder-menu">
        <el-dropdown-item v-if="currentFolderId" command="inbox">
          <Icon icon="mdi:inbox-arrow-down-outline" width="18" height="18"/>
          <span class="move-folder-name">{{ $t('moveToInbox') }}</span>
        </el-dropdown-item>
        <el-dropdown-item v-for="item in targetFolders" :key="item.folderId" :command="item.folderId">
          <Icon icon="mdi:folder-outline" width="18" height="18"/>
          <span class="move-folder-name">{{ item.name }}</span>
        </el-dropdown-item>
        <el-dropdown-item command="new" :divided="targetFolders.length > 0 || !!currentFolderId">
          <Icon icon="mdi:folder-plus-outline" width="18" height="18"/>
          <span class="move-folder-name">{{ $t('newFolder') }}</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
//"移到文件夹"下拉按钮，用在邮件列表工具栏和邮件详情页
import {Icon} from "@iconify/vue";
import {computed} from "vue";
import {useI18n} from "vue-i18n";
import {useFolderStore} from "@/store/folder.js";
import {promptFolderName} from "@/components/folder-menu/prompt.js";

const props = defineProps({
  //返回要移动的邮件 id 数组
  getEmailIds: {
    type: Function,
    required: true
  },
  //当前所在文件夹，0 表示收件箱/已发送/星标
  currentFolderId: {
    type: Number,
    default: 0
  },
  size: {
    type: [Number, String],
    default: 20
  }
})

const emit = defineEmits(['moved'])

const {t} = useI18n()
const folderStore = useFolderStore()

const targetFolders = computed(() => folderStore.folders.filter(item => item.folderId !== props.currentFolderId))

function visibleChange(visible) {
  if (visible && !folderStore.loaded) folderStore.load().catch(() => {})
}

async function handleCommand(command) {
  const emailIds = props.getEmailIds()
  if (!emailIds?.length) return

  let folderId = command
  if (command === 'inbox') folderId = 0

  if (command === 'new') {
    try {
      const name = await promptFolderName(t, t('newFolder'))
      const row = await folderStore.add(name)
      folderId = row.folderId
    } catch {
      return
    }
  }

  await folderStore.move(emailIds, folderId)
  ElMessage({
    message: t('moveSuccessMsg'),
    type: 'success',
    plain: true
  })
  emit('moved', folderId)
}
</script>

<style scoped>
.move-folder {
  display: flex;
  align-items: center;
  color: inherit;
  outline: none;
}

.icon {
  cursor: pointer;
  outline: none;
}

.move-folder-name {
  margin-left: 8px;
  max-width: 220px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
