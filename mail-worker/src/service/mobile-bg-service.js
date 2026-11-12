import fileUtils from '../utils/file-utils';
import r2Service from './r2-service';
import constant from '../const/constant';

//手机端登录背景，单独存在 KV 里，不改上游 setting 表
const KV_KEY = 'mobile_background:';

const mobileBgService = {

	async get(c) {
		return (await c.env.kv.get(KV_KEY)) || '';
	},

	async delete(c) {
		const background = await this.get(c);
		if (!background) return;
		if (!background.startsWith('http')) {
			await r2Service.delete(c, background);
		}
		await c.env.kv.delete(KV_KEY);
	},

	async set(c, params) {
		let { background } = params;

		await this.delete(c);

		if (background && !background.startsWith('http')) {
			const file = fileUtils.base64ToFile(background);
			const arrayBuffer = await file.arrayBuffer();
			background = constant.BACKGROUND_PREFIX + await fileUtils.getBuffHash(arrayBuffer) + fileUtils.getExtFileName(file.name);
			await r2Service.putObj(c, background, arrayBuffer, {
				contentType: file.type,
				cacheControl: `public, max-age=31536000, immutable`,
				contentDisposition: `inline; filename="${file.name}"`
			});
		}

		if (background) {
			await c.env.kv.put(KV_KEY, background);
		}
		return background || '';
	}
};

export default mobileBgService;
