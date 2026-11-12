import http from '@/axios/index.js';

//手机端登录背景
export function setMobileBackground(background) {
    return http.put('/setting/setBackgroundMobile', {background})
}

export function deleteMobileBackground() {
    return http.delete('/setting/deleteBackgroundMobile')
}
