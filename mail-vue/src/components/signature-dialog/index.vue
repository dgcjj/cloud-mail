<template>
  <el-dialog
      :model-value="modelValue"
      @update:model-value="val => emit('update:modelValue', val)"
      :title="t('signatureTitle')"
      width="min(640px, calc(100% - 40px))"
      append-to-body
      destroy-on-close
      @opened="onOpened"
      @closed="editorReady = false"
  >
    <div class="signature-account">{{ email }}</div>
    <div class="signature-editor">
      <tinyEditor v-if="editorReady" editor-id="signature-editor" :def-value="defValue" ref="editor" />
    </div>
    <div class="signature-options">
      <el-checkbox v-model="newEnabled">{{ t('signatureNewEnabled') }}</el-checkbox>
      <el-checkbox v-model="replyEnabled">{{ t('signatureReplyEnabled') }}</el-checkbox>
    </div>
    <div class="signature-tip">{{ t('signatureTip') }}</div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('cancel') }}</el-button>
      <el-button type="primary" :loading="saving" @click="save">{{ t('save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import tinyEditor from '@/components/tiny-editor/index.vue'
import {ref} from "vue";
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

async function onOpened() {
  await signatureStore.load()
  const row = signatureStore.get(props.accountId)
  defValue.value = row.content
  newEnabled.value = row.newEnabled
  replyEnabled.value = row.replyEnabled
  //对话框打开动画结束后再创建编辑器，避免 TinyMCE 计算尺寸出错
  editorReady.value = true
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
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
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
</style>
