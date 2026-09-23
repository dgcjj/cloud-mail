<template>
  <!--
    不用 el-dialog：它的层级（2000+）高于 TinyMCE 下拉菜单（1300），且会锁定焦点，
    导致字号、颜色、链接等工具栏功能无法使用。这里用自定义浮层，层级（1000）介于写信窗口（~101）和 TinyMCE 菜单（1201/1300）之间。
  -->
  <Teleport to="body">
    <div class="signature-mask" v-if="modelValue">
      <div class="signature-box">
        <div class="signature-header">
          <span class="signature-title">{{ t('signatureTitle') }}</span>
          <Icon class="signature-close" icon="material-symbols-light:close-rounded" width="22" height="22" @click="close"/>
        </div>
        <div class="signature-account">{{ email }}</div>
        <div class="signature-editor">
          <tinyEditor v-if="editorReady" editor-id="signature-editor" :def-value="defValue" ref="editor"/>
        </div>
        <div class="signature-options">
          <el-checkbox v-model="newEnabled">{{ t('signatureNewEnabled') }}</el-checkbox>
          <el-checkbox v-model="replyEnabled">{{ t('signatureReplyEnabled') }}</el-checkbox>
        </div>
        <div class="signature-tip">{{ t('signatureTip') }}</div>
        <div class="signature-footer">
          <el-button @click="close">{{ t('cancel') }}</el-button>
          <el-button type="primary" :loading="saving" @click="save">{{ t('save') }}</el-button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import tinyEditor from '@/components/tiny-editor/index.vue'
import {nextTick, onUnmounted, ref, watch} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {useSignatureStore} from "@/store/signature.js";

const props = defineProps({
  modelValue: Boolean,
  accountId: Number,
  email: String
})

const emit = defineEmits(['update:modelValue', 'saved'])

//文案放在组件内，避免改动上游的 i18n 文件
const {t} = useI18n({
  useScope: 'local',
  messages: {
    zh: {
      signatureTitle: '邮件签名',
      signatureNewEnabled: '写新邮件时自动添加',
      signatureReplyEnabled: '回复/转发时自动添加',
      signatureTip: '签名只对当前发件邮箱生效。图片建议使用网络链接，本地上传的图片会作为内嵌附件发送并占用图片数量限制。',
      cancel: '取消',
      save: '保存',
      saveSuccess: '签名已保存'
    },
    en: {
      signatureTitle: 'Email signature',
      signatureNewEnabled: 'Add to new emails',
      signatureReplyEnabled: 'Add to replies/forwards',
      signatureTip: 'The signature applies to the current sender address only. Prefer image links; uploaded images are sent as inline attachments and count toward the image limit.',
      cancel: 'Cancel',
      save: 'Save',
      saveSuccess: 'Signature saved'
    }
  }
})

const signatureStore = useSignatureStore()
const editor = ref({})
const editorReady = ref(false)
const defValue = ref('')
const newEnabled = ref(true)
const replyEnabled = ref(true)
const saving = ref(false)

watch(() => props.modelValue, async (visible) => {
  if (visible) {
    window.addEventListener('keydown', handleKeyDown, true)
    await signatureStore.load().catch(() => {})
    const row = signatureStore.get(props.accountId)
    defValue.value = row.content
    newEnabled.value = row.newEnabled
    replyEnabled.value = row.replyEnabled
    await nextTick()
    editorReady.value = true
  } else {
    window.removeEventListener('keydown', handleKeyDown, true)
    editorReady.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown, true)
})

//捕获阶段拦截 Esc：只关闭签名框，不让写信窗口也跟着关闭
function handleKeyDown(event) {
  if (event.key !== 'Escape') return
  //TinyMCE 自己的菜单/对话框打开时，交给 TinyMCE 处理
  if (document.querySelector('.tox-menu, .tox-dialog, .tox-collection--list')) return
  event.stopImmediatePropagation()
  close()
}

function close() {
  emit('update:modelValue', false)
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const content = editor.value.getContent()
    const row = await signatureStore.save(props.accountId, {
      content,
      newEnabled: newEnabled.value,
      replyEnabled: replyEnabled.value
    })
    ElMessage({message: t('saveSuccess'), type: 'success', plain: true})
    emit('saved', row)
    close()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.signature-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--el-overlay-color-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
}

.signature-box {
  background: var(--el-bg-color);
  width: min(640px, calc(100% - 40px));
  max-height: calc(100% - 40px);
  overflow: auto;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  border: 1px solid var(--el-border-color-light);
}

.signature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .signature-title {
    font-size: 18px;
    font-weight: bold;
  }

  .signature-close {
    cursor: pointer;
  }
}

.signature-account {
  color: var(--regular-text-color);
  margin-bottom: 10px;
}

.signature-editor {
  height: 260px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.signature-options {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 0 20px;
}

.signature-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--secondary-text-color);
}

.signature-footer {
  display: flex;
  justify-content: end;
  margin-top: 16px;
}
</style>
