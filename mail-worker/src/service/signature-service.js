import BizError from '../error/biz-error';
import accountService from './account-service';
import { t } from '../i18n/i18n';

//签名保存在 KV，每个用户一个 key，值为 { [accountId]: { content, newEnabled, replyEnabled } }
//不改数据库表结构，避免和上游的 init.js 迁移冲突
const SIGNATURE_KEY = 'signature:';
const MAX_CONTENT_SIZE = 1024 * 1024;

const signatureService = {

	async list(c, userId) {
		const map = await c.env.kv.get(SIGNATURE_KEY + userId, { type: 'json' });
		return map || {};
	},

	async set(c, params, userId) {

		let { accountId, content, newEnabled, replyEnabled } = params;

		accountId = Number(accountId);
		content = typeof content === 'string' ? content : '';

		const accountRow = await accountService.selectById(c, accountId);

		if (!accountRow || accountRow.userId !== userId) {
			throw new BizError(t('senderAccountNotExist'));
		}

		if (content.length > MAX_CONTENT_SIZE) {
			throw new BizError('Signature is too large (max 1MB)');
		}

		const map = await this.list(c, userId);

		map[accountId] = {
			content,
			newEnabled: newEnabled !== false,
			replyEnabled: replyEnabled !== false
		};

		await c.env.kv.put(SIGNATURE_KEY + userId, JSON.stringify(map));

		return map[accountId];
	}
};

export default signatureService;
