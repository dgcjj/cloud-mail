import {ElMessageBox} from "element-plus";

//输入文件夹名称，返回去掉首尾空格后的名称
export function promptFolderName(t, title, defaultName = '') {
    return ElMessageBox.prompt('', title, {
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
        inputValue: defaultName,
        inputPlaceholder: t('folderNamePlaceholder'),
        inputValidator: value => {
            const name = String(value ?? '').trim()
            if (!name) return t('folderNamePlaceholder')
            if (name.length > 30) return t('folderNamePlaceholder')
            return true
        }
    }).then(({value}) => value.trim())
}
