<template>
  <el-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" @open="load"
             :title="t('aiWriteSetting')" width="min(460px, calc(100% - 20px))">
    <el-form label-position="top" v-loading="loadingConfig">
      <el-form-item :label="t('aiWrite')">
        <el-switch v-model="form.enabled"/>
      </el-form-item>
      <el-form-item :label="t('aiProvider')">
        <el-radio-group v-model="form.provider">
          <el-radio value="workers">Workers AI</el-radio>
          <el-radio value="custom">{{ t('aiProviderCustom') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <template v-if="form.provider === 'workers'">
        <el-form-item :label="t('aiModel')">
          <el-select v-model="form.workersModel" filterable allow-create clearable :placeholder="defaultWorkersModel">
            <el-option v-for="item in workersModels" :key="item" :value="item" :label="item"/>
          </el-select>
          <div class="tip">{{ t('aiWorkersModelTip') }}</div>
        </el-form-item>
      </template>

      <template v-else>
        <el-form-item :label="t('aiPreset')">
          <el-select v-model="preset" @change="applyPreset" :placeholder="t('aiPresetPlaceholder')">
            <el-option v-for="item in presets" :key="item.label" :value="item.label" :label="item.label"/>
          </el-select>
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input v-model="form.baseUrl" placeholder="https://api.example.com/v1"/>
          <div class="tip">{{ t('aiBaseUrlTip') }}</div>
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="form.apiKey" type="password" show-password :placeholder="maskedKey || 'sk-...'"/>
        </el-form-item>
        <el-form-item :label="t('aiModel')">
          <el-input v-model="form.model" placeholder="gemini-3.1-flash-lite"/>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.fallback">{{ t('aiFallback') }}</el-checkbox>
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('cancel') }}</el-button>
      <el-button type="primary" :loading="saving" @click="save">{{ t('save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import {reactive, ref} from "vue";
import {useI18n} from "vue-i18n";
import {aiComposeQuery, aiComposeSet} from "@/request/ai.js";

defineProps({modelValue: Boolean})
const emit = defineEmits(['update:modelValue'])
const {t} = useI18n()

const workersModels = [
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
]

//OpenAI 兼容接口
const presets = [
  {label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.1-flash-lite'},
  //deepseek-chat 是 deepseek-flash 的非思考模式；直接用 deepseek-flash 会先输出推理过程，占掉 max_tokens
  {label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat'},
  {label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: ''},
  {label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: ''}
]

const form = reactive({
  enabled: true,
  provider: 'workers',
  workersModel: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  fallback: true
})
const preset = ref('')
const maskedKey = ref('')
const defaultWorkersModel = ref('')
const loadingConfig = ref(false)
const saving = ref(false)

function load() {
  loadingConfig.value = true
  aiComposeQuery().then(data => {
    Object.keys(form).forEach(key => {
      if (data[key] !== undefined) form[key] = data[key]
    })
    maskedKey.value = data.apiKey
    form.apiKey = ''
    defaultWorkersModel.value = data.defaultWorkersModel
    preset.value = presets.find(item => item.baseUrl === data.baseUrl)?.label || ''
  }).finally(() => loadingConfig.value = false)
}

function applyPreset(label) {
  const item = presets.find(p => p.label === label)
  if (!item) return
  form.baseUrl = item.baseUrl
  if (item.model) form.model = item.model
}

function save() {
  const params = {...form}
  //没填新 key 时不覆盖已保存的 key
  if (!params.apiKey) delete params.apiKey
  saving.value = true
  aiComposeSet(params).then(() => {
    ElMessage({message: t('saveSuccessMsg'), type: 'success', plain: true})
    emit('update:modelValue', false)
  }).finally(() => saving.value = false)
}
</script>

<style scoped lang="scss">
.tip {
  font-size: 12px;
  line-height: 1.5;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}
</style>
