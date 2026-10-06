<template>
  <el-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" @closed="stop"
             top="8vh" width="min(680px, calc(100% - 20px))" class="ai-compose-dialog">
    <template #header>
      <div class="ai-head">
        <Icon icon="hugeicons:ai-magic" width="22" height="22"/>
        <span>{{ t('aiWrite') }}</span>
      </div>
    </template>

    <el-radio-group v-model="mode" size="small" class="ai-modes" :disabled="loading">
      <el-radio-button value="draft">{{ t('aiModeDraft') }}</el-radio-button>
      <el-radio-button value="reply" v-if="replySource">{{ t('aiModeReply') }}</el-radio-button>
      <el-radio-button value="polish">{{ t('aiModePolish') }}</el-radio-button>
      <el-radio-button value="translate">{{ t('aiModeTranslate') }}</el-radio-button>
    </el-radio-group>

    <div class="ai-reply-from" v-if="mode === 'reply'">
      {{ t('aiReplyTo') }}: {{ replySource.from }} · {{ replySource.subject }}
    </div>

    <el-input v-if="mode === 'polish' || mode === 'translate'" v-model="sourceText" type="textarea"
              :autosize="{minRows: 3, maxRows: 8}" :placeholder="t('aiSourcePlaceholder')" class="ai-field"/>

    <el-input v-model="instruction" type="textarea" :autosize="{minRows: 2, maxRows: 6}" class="ai-field"
              :placeholder="instructionPlaceholder" @keydown.ctrl.enter="generate" @keydown.meta.enter="generate"/>

    <div class="ai-options">
      <el-select v-model="tone" size="small" class="ai-select" v-if="mode !== 'translate'">
        <el-option value="" :label="t('aiToneDefault')"/>
        <el-option value="formal" :label="t('aiToneFormal')"/>
        <el-option value="friendly" :label="t('aiToneFriendly')"/>
        <el-option value="concise" :label="t('aiToneConcise')"/>
        <el-option value="polite" :label="t('aiTonePolite')"/>
      </el-select>
      <el-select v-model="lang" size="small" class="ai-select" v-if="mode !== 'polish'">
        <el-option value="" :label="mode === 'translate' ? t('aiLangAutoTranslate') : t('aiLangAuto')"/>
        <el-option v-for="item in langs" :key="item.value" :value="item.value" :label="item.label"/>
      </el-select>
      <div class="ai-spacer"></div>
      <el-button size="small" type="primary" :loading="loading" @click="generate">
        {{ result ? t('aiRegenerate') : t('aiGenerate') }}
      </el-button>
      <el-button size="small" v-if="loading" @click="stop">{{ t('aiStop') }}</el-button>
    </div>

    <div class="ai-result" v-if="result || loading">
      <div class="ai-subject" v-if="parsed.subject">{{ t('subject') }}: {{ parsed.subject }}</div>
      <div class="ai-body">{{ parsed.body }}<span class="ai-cursor" v-if="loading">▍</span></div>
    </div>
    <div class="ai-model" v-if="model">{{ model }}</div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('cancel') }}</el-button>
      <el-button type="primary" :disabled="!result || loading" @click="insert">
        {{ hasSelection && (mode === 'polish' || mode === 'translate') ? t('aiReplaceSelection') : t('aiInsert') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import {computed, ref, watch} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {aiCompose} from "@/request/ai.js";

const props = defineProps({
  modelValue: Boolean,
  //回复时的原邮件 { from, subject, text }
  replySource: Object,
  //打开时编辑器里选中的文字
  selectedText: String,
  senderName: String
})

const emit = defineEmits(['update:modelValue', 'insert'])
const {t} = useI18n()

const langs = [
  {value: 'zh', label: '中文'},
  {value: 'en', label: 'English'},
  {value: 'fr', label: 'Français'},
  {value: 'ja', label: '日本語'},
  {value: 'ko', label: '한국어'},
  {value: 'es', label: 'Español'},
  {value: 'de', label: 'Deutsch'}
]

const mode = ref('draft')
const instruction = ref('')
const sourceText = ref('')
const tone = ref('')
const lang = ref('')
const result = ref('')
const model = ref('')
const loading = ref(false)
let controller = null

const hasSelection = computed(() => !!props.selectedText)

const instructionPlaceholder = computed(() => ({
  draft: t('aiDraftPlaceholder'),
  reply: t('aiReplyPlaceholder'),
  polish: t('aiExtraPlaceholder'),
  translate: t('aiExtraPlaceholder')
})[mode.value])

//写新邮件时第一行是 "Subject: xxx"
const parsed = computed(() => {
  const text = result.value.replace(/^\s+/, '')
  if (mode.value === 'draft') {
    const match = text.match(/^(?:subject|主题|主旨|objet)\s*[:：]\s*(.*)\n?/i)
    if (match) {
      return {subject: match[1].trim(), body: text.slice(match[0].length).replace(/^\s+/, '')}
    }
  }
  return {subject: '', body: text}
})

watch(() => props.modelValue, (val) => {
  if (!val) return
  result.value = ''
  model.value = ''
  sourceText.value = props.selectedText || ''
  if (props.selectedText) {
    mode.value = 'polish'
  } else if (props.replySource) {
    mode.value = 'reply'
  } else {
    mode.value = 'draft'
  }
})

watch(mode, () => {
  result.value = ''
  model.value = ''
})

async function generate() {
  if (loading.value) return

  const params = {
    mode: mode.value,
    instruction: instruction.value,
    tone: tone.value,
    lang: lang.value,
    senderName: props.senderName
  }

  if (mode.value === 'polish' || mode.value === 'translate') {
    params.text = sourceText.value
  }

  if (mode.value === 'reply') {
    params.original = props.replySource
  }

  controller = new AbortController()
  loading.value = true
  result.value = ''
  model.value = ''

  try {
    const res = await aiCompose(params, (text) => result.value = text, controller.signal)
    model.value = res.model
    if (!res.text.trim()) {
      ElMessage({message: t('aiEmptyResult'), type: 'warning', plain: true})
    }
  } catch (e) {
    if (e?.name !== 'AbortError') {
      ElMessage({message: e?.message || t('aiFailed'), type: 'error', plain: true})
    }
  } finally {
    loading.value = false
    controller = null
  }
}

function stop() {
  controller?.abort()
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

//纯文本转成编辑器里的段落：空行分段，段内换行用 <br>
function toHtml(text) {
  return text.trim().split(/\n\s*\n/)
      .map(p => `<div>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</div>`)
      .join('<div><br></div>')
}

function insert() {
  const {subject, body} = parsed.value
  if (!body.trim()) return
  emit('insert', {html: toHtml(body), subject})
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.ai-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
}

.ai-modes {
  margin-bottom: 12px;
}

.ai-reply-from {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-field {
  margin-bottom: 10px;
}

.ai-options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  .ai-select {
    width: 140px;
  }

  .ai-spacer {
    flex: 1;
  }

  .el-button + .el-button {
    margin-left: 0;
  }
}

.ai-result {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
  max-height: 45vh;
  overflow: auto;

  .ai-subject {
    font-weight: bold;
    margin-bottom: 8px;
  }

  .ai-body {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
  }

  .ai-cursor {
    animation: ai-blink 1s steps(1) infinite;
  }
}

.ai-model {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  text-align: right;
}

@keyframes ai-blink {
  50% {
    opacity: 0;
  }
}
</style>
