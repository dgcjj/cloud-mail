import http from '@/axios/index.js'

export function signatureList() {
    //后台预加载，失败时不弹提示
    return http.get('/signature/list', {noMsg: true})
}

export function signatureSet(accountId, content, newEnabled, replyEnabled) {
    return http.put('/signature/set', {accountId, content, newEnabled, replyEnabled})
}
