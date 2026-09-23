import { defineStore } from 'pinia'
import {signatureList, signatureSet} from '@/request/signature.js'

//签名标记：用于在编辑器内容里识别/替换签名块
export const SIGNATURE_ATTR = 'data-cm-signature'

export const useSignatureStore = defineStore('signature', {
    state: () => ({
        map: {},
        loaded: false
    }),
    actions: {
        async load(force = false) {
            if (this.loaded && !force) return this.map
            this.map = (await signatureList()) || {}
            this.loaded = true
            return this.map
        },
        get(accountId) {
            return this.map[accountId] || {content: '', newEnabled: true, replyEnabled: true}
        },
        async save(accountId, {content, newEnabled, replyEnabled}) {
            const row = await signatureSet(accountId, content, newEnabled, replyEnabled)
            this.map[accountId] = row
            return row
        },
        //生成要插入编辑器的签名块，type: 'new' | 'reply' | 'forward'；未设置或未启用时返回空字符串
        block(accountId, type) {
            const {content, newEnabled, replyEnabled} = this.get(accountId)
            if (!content) return ''
            if (type === 'new' && !newEnabled) return ''
            if (type !== 'new' && !replyEnabled) return ''
            return `<div class="cm-signature" ${SIGNATURE_ATTR}="1">${content}</div>`
        }
    }
})
