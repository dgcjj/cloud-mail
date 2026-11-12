//把 AI 返回的 "漢字{かな}" 渲染成 <ruby>，模型偶尔把读音放错位置，这里尽量纠正
const KANJI = '\\u4e00-\\u9fff\\u3400-\\u4dbf々〆ヶ'
const KANA = '\\u3040-\\u309f\\u30a0-\\u30ffー'
const PATTERN = new RegExp(`([${KANJI}]*)([${KANA}]*)\\{([^{}\\n]*)\\}`, 'g')

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function toHiragana(text) {
    return text.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

export function hasJapanese(text) {
    return /[぀-ヿ]/.test(text || '')
}

//去掉读音后的纯文本，用来判断模型有没有改动原文
export function stripReading(text) {
    return (text || '').replace(/\{[^{}\n]*\}/g, '')
}

export function furiganaHtml(text) {
    let html = ''
    let last = 0
    for (const m of (text || '').matchAll(PATTERN)) {
        const [all, kanji, kana] = m
        let reading = toHiragana(m[3].trim())
        html += escapeHtml(text.slice(last, m.index))
        last = m.index + all.length
        //前面没有汉字（如 ことが{こと}）：读音多余，丢掉
        if (!kanji) {
            html += escapeHtml(kana)
            continue
        }
        //读音放在送假名后面（如 お願い{ねがい}）：去掉读音里重复的送假名
        if (kana && reading.endsWith(toHiragana(kana))) {
            reading = reading.slice(0, reading.length - kana.length)
        }
        html += reading && reading !== kanji
            ? `<ruby>${escapeHtml(kanji)}<rt>${escapeHtml(reading)}</rt></ruby>${escapeHtml(kana)}`
            : escapeHtml(kanji + kana)
    }
    return html + escapeHtml((text || '').slice(last))
}
