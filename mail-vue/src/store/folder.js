import {defineStore} from 'pinia'
import {folderAdd, folderDelete, folderList, folderMove, folderRename, folderSort} from '@/request/folder.js'
import {useEmailStore} from '@/store/email.js'

//自定义文件夹
export const useFolderStore = defineStore('folder', {
    state: () => ({
        folders: [],
        loaded: false,
        //文件夹页面的列表组件
        folderScroll: null,
        //移动过邮件后加 1，文件夹页面据此决定是否刷新
        version: 0
    }),
    actions: {
        async load() {
            this.folders = (await folderList()) || []
            this.loaded = true
            return this.folders
        },
        find(folderId) {
            return this.folders.find(item => item.folderId === Number(folderId))
        },
        async add(name) {
            const row = await folderAdd(name)
            await this.load()
            return row
        },
        async rename(folderId, name) {
            await folderRename(folderId, name)
            await this.load()
        },
        async remove(folderId) {
            await folderDelete(folderId)
            await this.load()
            //里面的邮件回到了收件箱/已发送
            this.refreshMailboxes()
        },
        async moveSort(folderId, step) {
            const ids = this.folders.map(item => item.folderId)
            const index = ids.indexOf(folderId)
            const target = index + step
            if (index < 0 || target < 0 || target >= ids.length) return
            ids.splice(index, 1)
            ids.splice(target, 0, folderId)
            this.folders = ids.map(id => this.find(id))
            await folderSort(ids)
        },
        //移动邮件，folderId 为 0 表示移回收件箱/已发送
        async move(emailIds, folderId) {
            await folderMove(emailIds, folderId)
            const emailStore = useEmailStore()
            this.folderScroll?.deleteEmail(emailIds)
            if (folderId) {
                emailStore.emailScroll?.deleteEmail(emailIds)
                emailStore.sendScroll?.deleteEmail(emailIds)
            } else {
                this.refreshMailboxes()
            }
            this.version++
            this.load().catch(() => {})
        },
        refreshMailboxes() {
            const emailStore = useEmailStore()
            emailStore.emailScroll?.refreshList()
            emailStore.sendScroll?.refreshList()
        }
    }
})
