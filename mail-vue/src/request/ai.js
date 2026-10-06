import http from '@/axios/index.js'
import {useSettingStore} from "@/store/setting.js";

export function aiStatus() {
    return http.get('/ai/status', {noMsg: true})
}

export function aiComposeQuery() {
    return http.get('/setting/queryAiCompose')
}

export function aiComposeSet(config) {
    return http.put('/setting/setAiCompose', config)
}

//流式生成：onText 每收到一段文字调用一次，返回 { text, model }
export async function aiCompose(params, onText, signal) {
    const {lang} = useSettingStore();
    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/ai/compose`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${localStorage.getItem('token')}`,
            'accept-language': lang
        },
        body: JSON.stringify(params),
        signal
    })

    //出错时后端返回 JSON：{ code, message }
    if ((res.headers.get('content-type') || '').includes('application/json')) {
        const data = await res.json()
        throw data
    }

    if (!res.ok || !res.body) {
        throw {code: res.status, message: `HTTP ${res.status}`}
    }

    const model = decodeURIComponent(res.headers.get('X-AI-Model') || '')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let text = ''

    while (true) {
        const {done, value} = await reader.read()
        if (done) break
        const piece = decoder.decode(value, {stream: true})
        if (piece) {
            text += piece
            onText?.(text)
        }
    }

    return {text, model}
}
