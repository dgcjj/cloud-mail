//朗读文字：优先用 games.cesttout.ca 的微软神经语音（法/英/中/日），失败或其它语言用浏览器自带语音
const TTS_URL = 'https://games.cesttout.ca/api/tts'
const TTS_LANGS = ['fr', 'en', 'zh', 'ja']
const MAX_CHARS = 380

const LOCALE = {
    zh: 'zh-CN', en: 'en-US', fr: 'fr-CA', ja: 'ja-JP', ko: 'ko-KR', es: 'es-ES', de: 'de-DE'
}

let token = 0
let player = null

//没选语言时按文字猜：有假名是日语，有谚文是韩语，有汉字是中文，其它当英语
export function detectLang(text, lang) {
    if (lang) return lang
    if (/[぀-ヿ]/.test(text)) return 'ja'
    if (/[가-힯]/.test(text)) return 'ko'
    if (/[一-鿿]/.test(text)) return 'zh'
    if (/[àâçéèêëîïôûùüÿœ]/i.test(text)) return 'fr'
    return 'en'
}

//按句子切成不超过 MAX_CHARS 的段，接口一次最多 400 字
function chunks(text) {
    const sentences = text.replace(/\s+/g, ' ').trim().match(/[^。！？!?.…\n]+[。！？!?.…]*\s*/g) || []
    const list = []
    let cur = ''
    for (let s of sentences) {
        while (s.length > MAX_CHARS) {
            if (cur) list.push(cur), cur = ''
            list.push(s.slice(0, MAX_CHARS))
            s = s.slice(MAX_CHARS)
        }
        if ((cur + s).length > MAX_CHARS) {
            list.push(cur)
            cur = ''
        }
        cur += s
    }
    if (cur.trim()) list.push(cur)
    return list.map(s => s.trim()).filter(Boolean)
}

function playUrl(url, mine) {
    return new Promise((resolve, reject) => {
        const a = new Audio(url)
        player = a
        a.onended = () => resolve()
        a.onpause = () => resolve()
        a.onerror = () => reject(new Error('tts'))
        a.play().catch(e => mine === token ? reject(e) : resolve())
    })
}

function playDevice(text, lang, slow) {
    return new Promise(resolve => {
        if (!('speechSynthesis' in window)) return resolve()
        const u = new SpeechSynthesisUtterance(text)
        u.lang = LOCALE[lang] || lang
        u.rate = slow ? 0.7 : 0.95
        const voices = speechSynthesis.getVoices()
        const voice = voices.find(v => v.lang.replace('_', '-') === u.lang) || voices.find(v => v.lang.startsWith(lang))
        if (voice) u.voice = voice
        u.onend = () => resolve()
        u.onerror = () => resolve()
        speechSynthesis.speak(u)
    })
}

export function stopSpeak() {
    token++
    player?.pause()
    player = null
    if ('speechSynthesis' in window) speechSynthesis.cancel()
}

//朗读完（或被停止）后 resolve
export async function speak(text, lang, slow = false) {
    stopSpeak()
    const mine = token
    lang = detectLang(text, lang)
    let useDevice = !TTS_LANGS.includes(lang)
    for (const part of chunks(text)) {
        if (mine !== token) return
        if (!useDevice) {
            const url = `${TTS_URL}?lang=${lang}&v=f&r=${slow ? 'slow' : 'normal'}&t=${encodeURIComponent(part)}`
            try {
                await playUrl(url, mine)
                continue
            } catch (e) {
                if (mine !== token) return
                useDevice = true
            }
        }
        await playDevice(part, lang, slow)
    }
}
