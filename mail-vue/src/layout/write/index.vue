<template>
  <div class="send" v-show="show">
    <div class="write-box">
      <div class="title">
        <div class="title-left">
          <span class="title-text">
            <Icon icon="hugeicons:quill-write-01" width="28" height="28"/>
          </span>
          <span class="sender">{{ $t('sender') }}:</span>
          <span class="sender-name">{{ form.name }}</span>
          <span class="send-email"><{{ form.sendEmail }}></span>
        </div>
        <div @click="close" style="cursor: pointer;">
          <Icon icon="material-symbols-light:close-rounded" width="22" height="22"/>
        </div>
      </div>
      <div class="container">
        <div class="address-fields">
          <el-input-tag  @add-tag="addTagChange" tag-type="primary" @input="value => updateSuggest('receive', value)" size="large" v-model="form.receiveEmail" >
            <template #prefix>
              <div class="item-title" >{{ $t('recipient') }}</div>
              <el-select
                  ref="mySelect"
                  class="write-select"
                  popper-class="write-select"
                  :show-arrow="false"
                  :no-match-text="' '"
                  :no-data-text="' '"
                  @visible-change="status => suggestStatusChange('receive', status)"
                  @change="value => suggestChange('receive', value)"
              >
                <el-option
                    v-for="item in selectRecipientList"
                    :key="item"
                    :label="item"
                    :value="item"
                    style="color: #999896;"
                />
              </el-select>
            </template>
            <template #suffix>
              <div class="address-actions">
                <button type="button" class="address-toggle" v-if="form.manyType !== 'divide' && !showCc" @click.stop="openCc">CC</button>
                <button type="button" class="address-toggle" v-if="form.manyType !== 'divide' && !showBcc" @click.stop="openBcc">BCC</button>
                <Icon icon="fa7-solid:user-plus" width="20" height="20" class="add-contact" @click.stop="openContacts('receive')" />
              </div>
            </template>
          </el-input-tag>
          <el-input-tag v-if="form.manyType !== 'divide' && showCc" ref="ccInputRef" tag-type="primary" size="large" v-model="form.ccEmail" @input="value => updateSuggest('cc', value)" @add-tag="addCcTag">
            <template #prefix>
              <div class="item-title">{{ $t('cc') }}</div>
              <el-select
                  ref="ccSelectRef"
                  class="write-select"
                  popper-class="write-select"
                  :show-arrow="false"
                  :no-match-text="' '"
                  :no-data-text="' '"
                  @visible-change="status => suggestStatusChange('cc', status)"
                  @change="value => suggestChange('cc', value)"
              >
                <el-option
                    v-for="item in ccSuggestList"
                    :key="item"
                    :label="item"
                    :value="item"
                    style="color: #999896;"
                />
              </el-select>
            </template>
            <template #suffix>
              <div class="address-actions">
                <Icon icon="fa7-solid:user-plus" width="20" height="20" class="add-contact" @click.stop="openContacts('cc')" />
              </div>
            </template>
          </el-input-tag>
          <el-input-tag v-if="form.manyType !== 'divide' && showBcc" ref="bccInputRef" tag-type="primary" size="large" v-model="form.bccEmail" @input="value => updateSuggest('bcc', value)" @add-tag="addBccTag">
            <template #prefix>
              <div class="item-title">{{ $t('bcc') }}</div>
              <el-select
                  ref="bccSelectRef"
                  class="write-select"
                  popper-class="write-select"
                  :show-arrow="false"
                  :no-match-text="' '"
                  :no-data-text="' '"
                  @visible-change="status => suggestStatusChange('bcc', status)"
                  @change="value => suggestChange('bcc', value)"
              >
                <el-option
                    v-for="item in bccSuggestList"
                    :key="item"
                    :label="item"
                    :value="item"
                    style="color: #999896;"
                />
              </el-select>
            </template>
            <template #suffix>
              <div class="address-actions">
                <Icon icon="fa7-solid:user-plus" width="20" height="20" class="add-contact" @click.stop="openContacts('bcc')" />
              </div>
            </template>
          </el-input-tag>
        </div>
        <el-input v-model="form.subject" :placeholder="t('subject')" size="large"  @focus="hideEmptyCcBcc" style="padding-bottom: 4px" />
        <tinyEditor :def-value="defValue" ref="editor" @change="change" @focus="focusChange" />
        <div class="button-item">
          <div class="att-add" @click="chooseFile">
            <Icon icon="iconamoon:attachment-fill" width="24" height="24"/>
          </div>
          <div class="att-clear" @click="clearContent">
            <Icon icon="icon-park-outline:clear-format" width="24" height="24 "/>
          </div>
          <div class="att-clear" @click="showSignature = true" :title="$t('signature')">
            <Icon icon="mdi:signature-freehand" width="24" height="24"/>
          </div>
          <div class="att-clear" v-if="aiEnabled" @click="openAi" :title="$t('aiWrite')">
            <Icon icon="hugeicons:ai-magic" width="24" height="24"/>
          </div>
          <div class="att-list">
            <div class="att-item" v-for="(item,index) in form.attachments" :key="index">
              <Icon v-bind="getIconByName(item.filename)"/>
              <span class="att-filename">{{ item.filename }}</span>
              <span class="att-size">{{ formatBytes(item.size) }}</span>
              <Icon style="cursor: pointer;" icon="material-symbols-light:close-rounded" @click="delAtt(index)"
                    width="22" height="22"/>
            </div>
          </div>
          <div>
            <el-dropdown split-button type="primary" trigger="click" @click="sendEmail" @command="selectSendMode">
              {{ sendButtonLabel }}
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="together">
                    {{ $t(form.sendType === 'forward' ? 'forward' : 'send') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="divide">
                    {{ separateSendLabel }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </div>
    <el-dialog top="10vh" v-model="showContacts" @closed="clearSelectContact" :title="t('recentContacts')">
      <el-table class="contacts-table" ref="contactsTabRef" row-key="email" :data="contacts" style="height: 445px" @row-click="toggleContactRow">
        <el-table-column type="selection" width="32" />
        <el-table-column property="email" :label="t('emailAccount')" >
          <template #default="props">
            <div class="email-row">{{ props.row.email }}</div>
          </template>
        </el-table-column>
        <el-table-column width="55" label="" >
          <template #default>
            <div style="display: flex;">
              <Icon icon="mage:user" style="color: var(--el-text-color-primary)" width="22" height="22" color="#606266" />
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="contacts-bottom">
        <el-button type="default" @click="deleteContact">{{t('clear')}}</el-button>
        <el-button type="primary" @click="chooseContact">{{t('selectContacts')}}</el-button>
      </div>
    </el-dialog>
    <signatureDialog v-model="showSignature" :account-id="form.accountId" :email="form.sendEmail" @saved="applySignature" />
    <aiComposeDialog v-model="showAi" :reply-source="replySource" :selected-text="aiSelectedText" :sender-name="form.name" @insert="insertAi" />
  </div>
</template>
<script setup>
import tinyEditor from '@/components/tiny-editor/index.vue'
import signatureDialog from '@/components/signature-dialog/index.vue'
import aiComposeDialog from '@/components/ai-compose-dialog/index.vue'
import {aiStatus} from "@/request/ai.js";
import {useSignatureStore, SIGNATURE_ATTR} from "@/store/signature.js";
import {h, nextTick, onMounted, onUnmounted, reactive, ref, toRaw, computed} from "vue";
import {Icon} from "@iconify/vue";
import {useUserStore} from "@/store/user.js";
import {emailSend} from "@/request/email.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {fileToBase64, formatBytes} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import sendPercent from "@/components/send-percent/index.vue"
import {toOssDomain} from "@/utils/convert.js";
import {formatDetailDate} from "@/utils/day.js";
import {useSettingStore} from "@/store/setting.js";
import {userDraftStore} from "@/store/draft.js";
import {useWriterStore} from "@/store/writer.js";
import db from "@/db/db.js";
import dayjs from "dayjs";
import {useI18n} from "vue-i18n";
import router from "@/router/index.js";
import {ElMessageBox} from "element-plus";

defineExpose({
  open,
  openReply,
  openReplyAll,
  openForward,
  openDraft
})

const {t} = useI18n()
const writerStore = useWriterStore();
const draftStore = userDraftStore()
const settingStore = useSettingStore()
const emailStore = useEmailStore();
const accountStore = useAccountStore()
const editor = ref({})
const userStore = useUserStore();
const show = ref(false);
const percent = ref(0)
let percentMessage = null
let sending = false
const defValue = ref('')
const contactsTabRef = ref({})
const showContacts = ref(false)
const contactTarget = ref('receive')
const showCc = ref(false)
const showBcc = ref(false)
const ccInputRef = ref()
const bccInputRef = ref()
const mySelect = ref()
const ccSelectRef = ref()
const bccSelectRef = ref()
const suggestOpen = { receive: false, cc: false, bcc: false }
const backReply = reactive({
  receiveEmail: [],
  cc: [],
  subject: '',
  content: '',
  sendType: ''
})
const form = reactive({
  sendEmail: '',
  receiveEmail: [],
  ccEmail: [],
  bccEmail: [],
  accountId: -1,
  name: '',
  subject: '',
  content: '',
  sendType: '',
  manyType: 'together',
  text: '',
  emailId: 0,
  attachments: [],
  draftId: null,
})

const selectRecipientList = ref([])
const signatureStore = useSignatureStore()
const showSignature = ref(false)
//新邮件打开时编辑器里的初始内容（只有签名），用于判断是否真的写了内容
let newMailInitContent = ''
const aiEnabled = ref(false)
const showAi = ref(false)
const aiSelectedText = ref('')
//回复时给 AI 参考的原邮件
const replySource = ref(null)
const ccSuggestList = ref([])
const bccSuggestList = ref([])
const suggestListMap = { receive: selectRecipientList, cc: ccSuggestList, bcc: bccSuggestList }
const suggestSelectMap = { receive: mySelect, cc: ccSelectRef, bcc: bccSelectRef }
const suggestFieldMap = { receive: 'receiveEmail', cc: 'ccEmail', bcc: 'bccEmail' }

const contacts = computed(() => writerStore.sendRecipientRecord.map(item => ({email: item})))
const separateSendLabel = computed(() => t(form.sendType === 'forward' ? 'separateForward' : 'separateSend'))
const sendButtonLabel = computed(() => {
  if (form.manyType === 'divide') return separateSendLabel.value
  if (form.sendType === 'reply') return t('reply')
  if (form.sendType === 'forward') return t('forward')
  return t('send')
})

function clearCcBcc() {
  form.ccEmail = []
  form.bccEmail = []
  showCc.value = false
  showBcc.value = false
}

function selectSendMode(mode) {
  form.manyType = mode
  if (mode === 'divide') {
    clearCcBcc()
  }
}

function targetAddressKey() {
  if (contactTarget.value === 'cc') return 'ccEmail'
  if (contactTarget.value === 'bcc') return 'bccEmail'
  return 'receiveEmail'
}

function openContacts(target = 'receive') {
  contactTarget.value = target
  showContacts.value = true
  nextTick(() => {
    form[targetAddressKey()].forEach(item => {
      if (writerStore.sendRecipientRecord.includes(item)) {
        contactsTabRef.value.toggleRowSelection({email: item});
      }
    })
  })
}

function deleteContact() {
  ElMessageBox.confirm(t('confirmDeletionOfContacts'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    const contactList = contactsTabRef.value.getSelectionRows().map(item => item.email);
    const key = targetAddressKey()
    form[key] = form[key].filter(item => !contactList.includes(item));
    writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.filter(item => !contactList.includes(item));
  })
}

function chooseContact() {

  const contactList = contactsTabRef.value.getSelectionRows().map(item => item.email);
  const key = targetAddressKey()
  contactList.forEach(item => {
    if (!form[key].includes(item)) {
      form[key].push(item);
    }
  })

  form[key] = form[key].filter(item => {
    return contactList.includes(item) || !writerStore.sendRecipientRecord.includes(item);
  });

  showContacts.value = false
}

function clearSelectContact() {
  contactsTabRef.value.clearSelection();
}

function toggleContactRow(row, column) {
  if (column?.type === 'selection') return
  contactsTabRef.value.toggleRowSelection(row)
}

function toggleSuggest(target) {
  suggestSelectMap[target].value?.toggleMenu()
}

function suggestStatusChange(target, status) {
  suggestOpen[target] = status
}

function suggestChange(target, value) {
  form[suggestFieldMap[target]].push(value)
}

function updateSuggest(target, value) {
  const field = suggestFieldMap[target]
  const list = writerStore.sendRecipientRecord.filter(item => value && !form[field].includes(item) && item.startsWith(value)).slice(0, 10)
  suggestListMap[target].value = list

  if (!suggestOpen[target] && list.length > 0) {
    toggleSuggest(target)
  }

  if (suggestOpen[target] && list.length === 0) {
    toggleSuggest(target)
  }
}

function closeOpenSuggest() {
  for (const target of ['receive', 'cc', 'bcc']) {
    if (suggestOpen[target]) toggleSuggest(target)
  }
}

function addAddressTag(list, val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  list.splice(list.length - 1, 1)

  let has = false
  emails.forEach(email => {
    if (isEmail(email) && !list.includes(email)) {
      list.push(email)
      has = true
    }
  })
  return has
}

function addTagChange(val) {
  if (addAddressTag(form.receiveEmail, val) && suggestOpen.receive) toggleSuggest('receive')
}

function addCcTag(val) {
  if (addAddressTag(form.ccEmail, val) && suggestOpen.cc) toggleSuggest('cc')
}

function addBccTag(val) {
  if (addAddressTag(form.bccEmail, val) && suggestOpen.bcc) toggleSuggest('bcc')
}

function openCc() {
  showCc.value = true
  nextTick(() => ccInputRef.value?.focus?.())
}

function openBcc() {
  showBcc.value = true
  nextTick(() => bccInputRef.value?.focus?.())
}

function hideEmptyCcBcc() {
  if (showCc.value && form.ccEmail.length === 0) {
    showCc.value = false
  }
  if (showBcc.value && form.bccEmail.length === 0) {
    showBcc.value = false
  }
}

function clearContent() {
  hideEmptyCcBcc()
  ElMessageBox.confirm(t('clearContentConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    resetForm()
  })

}

function delAtt(index) {
  form.attachments.splice(index, 1);
}

function chooseFile() {
  hideEmptyCcBcc()
  const doc = document.createElement("input")
  doc.setAttribute("type", "file")
  doc.multiple = true;
  doc.click()
  doc.onchange = async (e) => {

    const fileList = e.target.files;

    for (const file of fileList) {

      const size = file.size
      const filename = file.name
      const contentType = file.type

      const content = await fileToBase64(file)
      form.attachments.push({content, filename, size, contentType})

    }

  }
}

async function sendEmail() {
  hideEmptyCcBcc()

  if (form.receiveEmail.length === 0) {
    ElMessage({
      message: t('emptyRecipientMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.subject) {
    ElMessage({
      message: t('emptySubjectMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  form.content = editor.value.getContent();

  if (!form.content || isOnlySignature()) {
    ElMessage({
      message: t('emptyContentMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (sending) {
    ElMessage({
      message: t('sendingErrorMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  percentMessage = ElMessage({
    message: () => h(sendPercent, {value: percent.value, desc: t('sending')}),
    dangerouslyUseHTMLString: true,
    plain: true,
    duration: 0,
    customClass: 'message-bottom'
  })

  sending = true

  show.value = false

  emailSend(form, (e) => {
    percent.value = Math.round((e.loaded * 98) / e.total)
  }).then(result => {
    const emailList = Array.isArray(result) ? result : result.emails
    const email = emailList[0]
    emailList.forEach(item => {
      emailStore.sendScroll?.addItem(item)
    })

    userStore.refreshUserInfo();
    addRecipientRecord();

    if (result.failedRecipients?.length) {
      form.receiveEmail = result.failedRecipients
      show.value = true
      ElNotification({
        title: t('partialSendMsg', {count: emailList.length, failed: result.failedRecipients.length}),
        type: 'warning',
        message: result.error,
        position: 'bottom-right'
      })
      return
    }

    ElNotification({
      title: t('sendSuccessMsg'),
      type: "success",
      message: h('span', {style: 'color: teal'}, email.subject),
      position: 'bottom-right'
    })

    if (form.draftId) {
      form.subject = ''
      form.content = ''
      form.receiveEmail = []
      form.ccEmail = []
      form.bccEmail = []
      draftStore.setDraft = {...toRaw(form)}
    }

    show.value = false
    resetForm();
  }).catch((e) => {
    ElNotification({
      title: t('sendFailMsg'),
      type: e.code === 403 ? 'warning' : 'error',
      message: h('span', {style: 'color: teal'}, e.message),
      position: 'bottom-right'
    })
    if (e.code === 401) {
      localStorage.removeItem('token');
      router.replace('/login');
    }
    show.value = true
    addRecipientRecord();
  }).finally(() => {
    percentMessage.close()
    percent.value = 0
    sending = false
  })
}

function addRecipientRecord() {
  const seen = new Set()
  const addresses = []
  for (const email of [...form.receiveEmail, ...form.ccEmail, ...form.bccEmail]) {
    const key = String(email).trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    addresses.push(email)
  }

  writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.filter(
      email => !seen.has(String(email).trim().toLowerCase())
  );

  writerStore.sendRecipientRecord.unshift(...addresses);
  writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.slice(0, 500);
}

//新邮件里只有自动插入的签名，没有写其它内容
function isOnlySignature() {
  return !form.sendType && !!newMailInitContent && editor.value.getContent() === newMailInitContent
}

function resetForm() {
  newMailInitContent = ''
  replySource.value = null
  form.receiveEmail = []
  form.ccEmail = []
  form.bccEmail = []
  showCc.value = false
  showBcc.value = false
  form.subject = ''
  form.content = ''
  form.manyType = 'together'
  form.attachments = []
  form.sendType = ''
  form.emailId = 0
  form.draftId = null
  backReply.content = ''
  backReply.subject = ''
  backReply.receiveEmail = []
  backReply.cc = []
  backReply.sendType = ''
  editor.value.clearEditor()
}

function change(content, text) {
  form.content = content;
  form.text = text
}

function focusChange() {
  closeOpenSuggest()
  hideEmptyCcBcc()
}

function openForward(email) {
  resetForm();

  email.subject = email.subject || ''

  form.subject = email.subject
  form.sendType = 'forward'

  defValue.value = ''

  setTimeout(() => {
    defValue.value = `${signaturePrefix('forward')}
      ${formatImage(email.content) || `<pre style="font-family: inherit;word-break: break-word;white-space: pre-wrap;margin: 0">${email.text}</pre>`}
    `
    open()

    nextTick(() => {
      backReply.content = editor.value.getContent()
      backReply.subject = form.subject
      backReply.receiveEmail = [...form.receiveEmail]
      backReply.sendType = form.sendType
    })

  });
}

function openReplyAll(email) {
  openReply(email, true)
}

//解析 recipient/cc 字段（JSON 字符串，postal-mime 格式，可能包含 group）为地址数组
function parseAddresses(value) {
  let list = []
  try {
    list = typeof value === 'string' ? JSON.parse(value) : (value || [])
  } catch {
    return []
  }
  if (!Array.isArray(list)) return []
  return list.flatMap(item => item?.group ? item.group : [item]).map(item => item?.address).filter(Boolean)
}

function currentSendEmail() {
  return accountStore.currentAccount.email || userStore.user.email
}

function openReply(email, replyAll = false) {

  resetForm();

  email.subject = email.subject || ''

  const myEmail = currentSendEmail()?.toLowerCase()
  const isMine = email.sendEmail?.toLowerCase() === myEmail

  if (replyAll && isMine) {
    //回复全部自己发出的邮件：沿用原收件人和抄送
    form.receiveEmail.push(...parseAddresses(email.recipient))
    form.ccEmail.push(...parseAddresses(email.cc).filter(item => !form.receiveEmail.includes(item)))
  } else {
    form.receiveEmail.push(email.sendEmail)
  }

  if (replyAll && !isMine) {
    //回复全部：原收件人和抄送都放进抄送，去掉自己和发件人
    const exclude = new Set([myEmail, email.sendEmail?.toLowerCase()])
    const ccList = [...parseAddresses(email.recipient), ...parseAddresses(email.cc)]
    ccList.forEach(item => {
      if (!exclude.has(item.toLowerCase())) {
        exclude.add(item.toLowerCase())
        form.ccEmail.push(item)
      }
    })
  }
  showCc.value = form.ccEmail.length > 0

  form.subject = (
      email.subject.startsWith('Re:') ||
      email.subject.startsWith('Re：') ||
      email.subject.startsWith('回复：') ||
      email.subject.startsWith('回复:')) ? email.subject : 'Re: ' + email.subject
  form.sendType = 'reply'
  form.emailId = email.emailId
  replySource.value = {
    from: email.name ? `${email.name} <${email.sendEmail}>` : email.sendEmail,
    subject: email.subject,
    text: email.text || htmlToText(email.content)
  }

  defValue.value = ''

  setTimeout(() => {
    defValue.value = `
    <div></div>${signaturePrefix('reply')}
    <div>
    <br>
        ${formatDetailDate(email.createTime)} ${email.name} &lt${email.sendEmail}&gt ${t('wrote')}:
    </div>
    <blockquote class="mceNonEditable" style="margin: 0 0 0 0.8ex;border-left: 1px solid rgb(204,204,204);padding-left: 1ex;">
      <articl>
          ${formatImage(email.content) || `<pre style="font-family: inherit;word-break: break-word;white-space: pre-wrap;margin: 0">${email.text}</pre>`}
      </article>
    </blockquote>`
    open()

    nextTick(() => {
      backReply.content = editor.value.getContent()
      backReply.subject = form.subject
      backReply.receiveEmail = [...form.receiveEmail]
      backReply.cc = [...form.ccEmail]
      backReply.sendType = form.sendType
    })
  })

}

function htmlToText(html) {
  const marked = (html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
  const doc = new DOMParser().parseFromString(marked, 'text/html')
  doc.querySelectorAll('style,script').forEach(item => item.remove())
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

function openAi() {
  aiSelectedText.value = editor.value.saveSelection()
  showAi.value = true
}

function insertAi({html, subject}) {
  editor.value.insertHtml(html)
  if (subject && !form.subject) {
    form.subject = subject
  }
}

function formatImage(content) {
  content = content || '';
  const domain = settingStore.settings.r2Domain;
  return content.replace(/{{domain}}/g, toOssDomain(domain) + '/');
}

function open() {
  if (!accountStore.currentAccount.email) {
    form.sendEmail = userStore.user.email;
    form.accountId = userStore.user.account.accountId;
    form.name = userStore.user.name;
  } else {
    form.sendEmail = accountStore.currentAccount.email;
    form.accountId = accountStore.currentAccount.accountId;
    form.name = accountStore.currentAccount.name;
  }
  show.value = true;
  editor.value.focus()
  insertNewMailSignature()
}

function currentAccountId() {
  return accountStore.currentAccount.email ? accountStore.currentAccount.accountId : userStore.user.account.accountId
}

//回复/转发时插在引用内容上方的签名
function signaturePrefix(type) {
  const block = signatureStore.block(currentAccountId(), type)
  return block ? `<div><br></div>${block}<div><br></div>` : ''
}

//写新邮件：编辑器为空时插入签名
function insertNewMailSignature() {
  if (form.sendType || form.draftId) return
  signatureStore.load().then(() => {
    if (form.sendType || form.draftId || !show.value || editor.value.getContent()) return
    const block = signatureStore.block(form.accountId, 'new')
    if (!block) return
    setEditorContent(`<div><br></div>${block}`, () => {
      newMailInitContent = editor.value.getContent()
    })
  }).catch(() => {})
}

function setEditorContent(html, callback) {
  defValue.value = ''
  setTimeout(() => {
    defValue.value = html
    nextTick(() => {
      callback?.()
      editor.value.focus()
    })
  })
}

//在对话框里保存签名后，替换当前正在写的邮件里的签名
function applySignature() {
  const type = form.sendType || 'new'
  const block = signatureStore.block(form.accountId, type)
  const before = editor.value.getContent()
  const doc = new DOMParser().parseFromString(`<body>${before}</body>`, 'text/html')
  const old = doc.querySelector(`[${SIGNATURE_ATTR}], .cm-signature`)
  if (old) {
    if (block) {
      old.outerHTML = block
    } else {
      old.remove()
    }
  } else if (block) {
    if (type === 'new') {
      doc.body.insertAdjacentHTML('beforeend', `<div><br></div>${block}`)
    } else {
      doc.body.insertAdjacentHTML('afterbegin', `<div><br></div>${block}<div><br></div>`)
    }
  } else {
    return
  }
  //内容还没被改动过时，同步更新"未改动"的基准，避免关闭时误提示保存草稿
  const untouchedNew = type === 'new' && (!before || before === newMailInitContent)
  const untouchedReply = type !== 'new' && before === backReply.content
  setEditorContent(doc.body.innerHTML, () => {
    const content = editor.value.getContent()
    if (untouchedNew) newMailInitContent = content
    if (untouchedReply) backReply.content = content
    if (form.content) {
      form.content = content
      form.text = doc.body.textContent
    }
  })
}

function openDraft(draft) {
  Object.assign(form, {...draft, manyType: draft.manyType || 'together'})
  form.ccEmail = draft.ccEmail || []
  form.bccEmail = draft.bccEmail || []
  if (form.manyType === 'divide') {
    clearCcBcc()
  }
  showCc.value = form.ccEmail.length > 0
  showBcc.value = form.bccEmail.length > 0
  defValue.value = ''
  setTimeout(() => defValue.value = form.content)
  show.value = true;
  editor.value.focus()
}

const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    //Esc 只关闭 AI 对话框，不关闭写信窗口
    //el-dialog 可能先处理 Esc 把 showAi 置为 false，所以再看一下对话框是否还显示着
    if (showAi.value || document.querySelector('.ai-compose-dialog')?.offsetParent) return
    close()
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  signatureStore.load(true).catch(() => {})
  aiStatus().then(data => aiEnabled.value = !!data?.enabled).catch(() => {})
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

function close() {

  closeOpenSuggest();

  if (!form.content) {
    form.content = editor.value.getContent();
  }

  if (form.draftId) {
    draftStore.setDraft = {...toRaw(form)}
    show.value = false
    resetForm()
    return;
  }

  if (!((form.content && !isOnlySignature()) || form.subject || form.receiveEmail.length > 0 || form.ccEmail.length > 0 || form.bccEmail.length > 0)) {
    show.value = false
    resetForm()
    return;
  }

  if (backReply.sendType === 'reply' || backReply.sendType === 'forward') {
    let subjectFlag = form.subject === backReply.subject
    let contentFlag = editor.value.getContent() === backReply.content
    let receiveFlag = form.receiveEmail.length > 0 && form.receiveEmail.join(',') === backReply.receiveEmail.join(',')
    if (backReply.sendType === 'forward' && form.receiveEmail.length === 0) {
      receiveFlag = true;
    }
    let ccFlag = form.ccEmail.join(',') === backReply.cc.join(',') && form.bccEmail.length === 0
    if (subjectFlag && contentFlag && receiveFlag && ccFlag) {
      resetForm();
      close()
      return;
    }
  }

  ElMessageBox.confirm(t('saveDraftConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning',
    distinguishCancelAndClose: true
  }).then(async () => {
    const formData = {...toRaw(form)};
    delete formData.draftId
    delete formData.attachments
    formData.createTime = dayjs().utc().format('YYYY-MM-DD HH:mm:ss');
    const draftId = await db.value.draft.add({...formData})
    db.value.att.add({draftId, attachments: toRaw(form.attachments)})
    draftStore.refreshList++
    show.value = false
    await nextTick(() => {
      resetForm()
    })
  }).catch((action) => {
    if (action === 'cancel') {
      show.value = false
      resetForm()
    }
  })

}

</script>
<style>
.write-select .el-select-dropdown__list {
  padding: 4px 4px !important;
}
.write-select .el-select-dropdown__item {
  padding: 0 10px 0 10px;
}

.write-select .el-select-dropdown {
  min-width: 0 !important;
}
</style>
<style scoped lang="scss">
.send {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  .write-box {
    background: var(--el-bg-color);
    width: min(1367px, calc(100% - 80px));
    box-shadow: var(--el-box-shadow-light);
    border: 1px solid var(--el-border-color-light);
    transition: var(--el-transition-duration);
    padding: 15px;
    border-radius: 8px;
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
    @media (max-width: 1024px) {
      width: 100%;
      height: 100%;
      border-radius: 0;
      border: 0;
      padding-top: 10px;
    }

    @media (min-width: 1025px) {
      height: min(800px, calc(100vh - 60px));
    }

    .title {
      display: flex;
      justify-content: space-between;
      .title-left {
        align-items: center;
        display: grid;
        grid-template-columns: auto auto auto 1fr;
      }

      .title-text {
      }

      .sender {
        margin-left: 8px;
      }

      .sender-name {
        margin-left: 8px;
        font-weight: bold;
      }

      .send-email {
        color: #999896;
        margin-left: 5px;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }


      div {
        display: flex;
        align-items: center;
      }
    }

    .container {
      height: 100%;
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      gap: 5px;

      .address-fields {
        display: grid;
      }

      :deep(.el-input-tag) {
        padding-right: 0;
        padding-left: 0;
      }

      :deep(.el-input-tag__suffix) {
        padding-right: 5px;
      }
      :deep(.el-input-tag__prefix) {
        padding-left: 5px;
      }

      :deep(.el-input__wrapper) {
        padding-left: 5px;
        padding-right: 5px;
      }

      :deep(.el-input-tag),
      :deep(.el-input__wrapper),
      :deep(.el-input-tag.is-focused),
      :deep(.el-input-tag.is-hovering),
      :deep(.el-input-tag:hover),
      :deep(.el-input__wrapper.is-focus),
      :deep(.el-input__wrapper:hover) {
        box-shadow: none;
        border-radius: 0;
        border-bottom: 1px solid var(--el-border-color-lighter);
      }

      .address-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-right: 3px;
      }

      .address-toggle {
        border: none;
        background: transparent;
        padding: 0;
        color: var(--regular-text-color);
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
        cursor: pointer;

        &:hover,
        &:focus {
          color: var(--regular-text-color);
        }
      }

      .item-title {
      }

      .button-item {
        display: grid;
        grid-template-columns: auto auto auto 1fr auto;

        .att-add {
          cursor: pointer;
        }

        .att-clear {
          cursor: pointer;
          margin-left: 10px;
        }

        .att-list {
          display: grid;
          gap: 5px;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          padding-left: 10px;
          padding-right: 10px;
          max-height: 110px;
          overflow-y: auto;
          @media (max-width: 450px) {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          }

          .att-item {
            display: grid;
            grid-template-columns: auto 1fr auto auto;
            gap: 5px;
            height: 32px;
            font-size: 14px;
            padding: 4px 5px;
            background: var(--light-ill);
            border-radius: 4px;
            .att-filename {
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow: hidden;
            }
          }
        }
      }
    }
  }

}

.email-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-dialog) {
  width: 420px !important;
  @media (max-width: 460px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.contacts-bottom {
  display: flex;
  justify-content: end;
  margin-top: 10px;
}

.contacts-table :deep(.el-table__row) {
  cursor: pointer;
}

.add-contact {
  color: var(--regular-text-color)
}

.write-select {
  position: absolute;
  width: 300px;
  left: 60px;
  z-index: 0;
  opacity: 0;
  pointer-events: none;
}

.icon {
  cursor: pointer;
}
</style>
