import http from "@/axios/index.js";

export function folderList() {
    return http.get('/folder/list')
}

export function folderAdd(name) {
    return http.post('/folder/add', {name})
}

export function folderRename(folderId, name) {
    return http.put('/folder/rename', {folderId, name})
}

export function folderSort(folderIds) {
    return http.put('/folder/sort', {folderIds})
}

export function folderDelete(folderId) {
    return http.delete('/folder/delete', {params: {folderId}})
}

//folderId 为 0 表示移回收件箱/已发送
export function folderMove(emailIds, folderId) {
    return http.put('/folder/move', {emailIds, folderId})
}

export function folderEmails(folderId, emailId, size, full) {
    return http.get('/folder/emails', {params: {folderId, emailId, size, full}})
}
