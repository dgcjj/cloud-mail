<template>
  <div class="folder-menu">
    <div class="folder-title">
      <span>{{ $t('myFolders') }}</span>
      <Icon class="folder-add" icon="ion:add-outline" width="18" height="18" :title="$t('newFolder')" @click.stop="addFolder"/>
    </div>
    <el-menu-item v-for="(item, index) in folderStore.folders" :key="item.folderId"
                  :index="'folder-' + item.folderId"
                  :class="['folder-item', isActive(item) ? 'choose-item' : '']"
                  @click="openFolder(item)">
      <Icon icon="mdi:folder-outline" width="20" height="20"/>
      <span class="menu-name folder-name" :title="item.name">{{ item.name }}</span>
      <span class="folder-unread" v-if="item.unreadCount">{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</span>
      <el-dropdown trigger="click" class="folder-more" @command="command => handleCommand(command, item)" @click.stop>
        <Icon icon="mdi:dots-horizontal" width="18" height="18" @click.stop/>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="rename">{{ $t('renameFolder') }}</el-dropdown-item>
            <el-dropdown-item command="up" :disabled="index === 0">{{ $t('folderMoveUp') }}</el-dropdown-item>
            <el-dropdown-item command="down" :disabled="index === folderStore.folders.length - 1">{{ $t('folderMoveDown') }}</el-dropdown-item>
            <el-dropdown-item command="delete" divided>
              <span style="color: var(--el-color-danger)">{{ $t('deleteFolder') }}</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-menu-item>
  </div>
</template>

<script setup>
//左侧菜单里的"我的文件夹"
import {Icon} from "@iconify/vue";
import {onMounted} from "vue";
import {useRoute} from "vue-router";
import {useI18n} from "vue-i18n";
import {ElMessageBox} from "element-plus";
import router from "@/router/index.js";
import {useFolderStore} from "@/store/folder.js";
import {promptFolderName} from "@/components/folder-menu/prompt.js";

const {t} = useI18n()
const route = useRoute()
const folderStore = useFolderStore()

onMounted(() => {
  folderStore.load().catch(() => {})
})

function isActive(item) {
  return route.name === 'folder' && Number(route.params.folderId) === item.folderId
}

function openFolder(item) {
  router.push({name: 'folder', params: {folderId: item.folderId}})
}

function addFolder() {
  promptFolderName(t, t('newFolder')).then(name => folderStore.add(name)).then(row => {
    if (row) openFolder(row)
  }).catch(() => {})
}

function handleCommand(command, item) {
  if (command === 'rename') {
    promptFolderName(t, t('renameFolder'), item.name)
        .then(name => folderStore.rename(item.folderId, name))
        .catch(() => {})
  }
  if (command === 'up') folderStore.moveSort(item.folderId, -1).catch(() => folderStore.load())
  if (command === 'down') folderStore.moveSort(item.folderId, 1).catch(() => folderStore.load())
  if (command === 'delete') {
    ElMessageBox.confirm(t('deleteFolderConfirm', {name: item.name}), {
      confirmButtonText: t('confirm'),
      cancelButtonText: t('cancel'),
      type: 'warning'
    }).then(() => folderStore.remove(item.folderId)).then(() => {
      if (isActive(item)) router.push({name: 'email'})
    }).catch(() => {})
  }
}
</script>

<style lang="scss" scoped>
.folder-title {
  margin-top: 12px;
  padding-left: 20px;
  padding-right: 22px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .folder-add {
    cursor: pointer;
    opacity: 0.8;

    &:hover {
      opacity: 1;
    }
  }
}

.el-menu-item {
  margin: 3px 12px !important;
  border-radius: 6px;
  height: 36px;
  padding: 10px !important;
  background: var(--aside-backgound);
}

.choose-item {
  font-weight: 400;
  background: var(--aside-menu-active-background) !important;
  backdrop-filter: blur(4px);
}

@media (hover: hover) {
  .el-menu-item:hover {
    background: rgba(255, 255, 255, 0.08) !important;
  }

  .el-menu-item:hover .folder-more {
    visibility: visible;
  }
}

.folder-name {
  margin-left: 16px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  user-select: none;
}

.folder-unread {
  font-size: 12px;
  margin-left: 6px;
  opacity: 0.9;
}

.folder-more {
  margin-left: 6px;
  color: #fff;
  visibility: hidden;
  outline: none;
}

//没有鼠标悬停的设备（手机）上一直显示"更多"按钮
@media (hover: none) {
  .folder-more {
    visibility: visible;
  }
}

.choose-item .folder-more {
  visibility: visible;
}
</style>
