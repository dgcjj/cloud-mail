import orm from '../entity/orm';
import { folder, emailFolder } from '../entity/folder';
import email from '../entity/email';
import { star } from '../entity/star';
import { and, asc, desc, eq, inArray, lt, sql, count } from 'drizzle-orm';
import { emailListColumns, emailBriefColumns } from '../lib/email-list-columns';
import { emailConst, isDel } from '../const/entity-const';
import BizError from '../error/biz-error';
import emailService from './email-service';
import { t } from '../i18n/i18n';

//自定义文件夹：表在第一次用到时自动创建，不改上游的 init.js
const NAME_MAX_LENGTH = 30;
const FOLDER_MAX_COUNT = 100;
const MOVE_MAX_COUNT = 500;

let tablesReady = false;

const folderService = {

	async ensureTables(c) {
		if (tablesReady) return;
		await c.env.db.batch([
			c.env.db.prepare(`
				CREATE TABLE IF NOT EXISTS folder (
					folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
					user_id INTEGER NOT NULL,
					name TEXT NOT NULL,
					sort INTEGER NOT NULL DEFAULT 0,
					create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
				)`),
			c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_folder_user_id ON folder(user_id)`),
			c.env.db.prepare(`
				CREATE TABLE IF NOT EXISTS email_folder (
					email_id INTEGER PRIMARY KEY,
					folder_id INTEGER NOT NULL,
					user_id INTEGER NOT NULL
				)`),
			c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_folder_folder_email ON email_folder(folder_id, email_id)`),
			c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_folder_user_id ON email_folder(user_id)`)
		]);
		tablesReady = true;
	},

	//收件箱/已发送列表用：排除已经移到文件夹里的邮件
	notInFolderCondition() {
		return sql`NOT EXISTS (SELECT 1 FROM email_folder WHERE email_folder.email_id = ${email.emailId})`;
	},

	checkName(name) {
		name = String(name ?? '').trim();
		if (!name) {
			throw new BizError(t('emptyFolderName'));
		}
		if (name.length > NAME_MAX_LENGTH) {
			throw new BizError(t('folderNameTooLong', { max: NAME_MAX_LENGTH }));
		}
		return name;
	},

	async selectOwn(c, folderId, userId) {
		const row = await orm(c).select().from(folder).where(
			and(eq(folder.folderId, Number(folderId)), eq(folder.userId, userId))
		).get();
		if (!row) {
			throw new BizError(t('notExistFolder'));
		}
		return row;
	},

	async list(c, userId) {
		await this.ensureTables(c);
		const folders = await orm(c).select().from(folder)
			.where(eq(folder.userId, userId))
			.orderBy(asc(folder.sort), asc(folder.folderId))
			.all();

		//每个文件夹的邮件数和未读数（已删除的邮件不算）
		const stats = await orm(c).select({
			folderId: emailFolder.folderId,
			total: count(),
			unreadCount: sql`SUM(CASE WHEN ${email.unread} = ${emailConst.unread.UNREAD} AND ${email.type} = ${emailConst.type.RECEIVE} THEN 1 ELSE 0 END)`.mapWith(Number)
		}).from(emailFolder)
			.innerJoin(email, eq(email.emailId, emailFolder.emailId))
			.where(and(eq(emailFolder.userId, userId), eq(email.isDel, isDel.NORMAL)))
			.groupBy(emailFolder.folderId)
			.all();

		return folders.map(item => {
			const stat = stats.find(s => s.folderId === item.folderId);
			return { ...item, total: stat?.total || 0, unreadCount: stat?.unreadCount || 0 };
		});
	},

	async add(c, params, userId) {
		await this.ensureTables(c);
		const name = this.checkName(params.name);
		const folders = await orm(c).select().from(folder).where(eq(folder.userId, userId)).all();
		if (folders.length >= FOLDER_MAX_COUNT) {
			throw new BizError(t('folderCountLimit', { max: FOLDER_MAX_COUNT }));
		}
		if (folders.some(item => item.name === name)) {
			throw new BizError(t('folderNameExist'));
		}
		const sort = folders.reduce((max, item) => Math.max(max, item.sort), 0) + 1;
		return orm(c).insert(folder).values({ userId, name, sort }).returning().get();
	},

	async rename(c, params, userId) {
		await this.ensureTables(c);
		const row = await this.selectOwn(c, params.folderId, userId);
		const name = this.checkName(params.name);
		const same = await orm(c).select().from(folder).where(
			and(eq(folder.userId, userId), eq(folder.name, name))
		).get();
		if (same && same.folderId !== row.folderId) {
			throw new BizError(t('folderNameExist'));
		}
		await orm(c).update(folder).set({ name }).where(eq(folder.folderId, row.folderId)).run();
	},

	//按传入顺序重新排序
	async sort(c, params, userId) {
		await this.ensureTables(c);
		const folderIds = (params.folderIds || []).map(Number);
		const own = await orm(c).select({ folderId: folder.folderId }).from(folder).where(eq(folder.userId, userId)).all();
		const ownIds = new Set(own.map(item => item.folderId));
		const updates = folderIds.filter(id => ownIds.has(id)).map((id, index) =>
			orm(c).update(folder).set({ sort: index + 1 }).where(eq(folder.folderId, id))
		);
		if (updates.length > 0) {
			await orm(c).batch(updates);
		}
	},

	//删除文件夹，里面的邮件回到收件箱/已发送
	async delete(c, params, userId) {
		await this.ensureTables(c);
		const row = await this.selectOwn(c, params.folderId, userId);
		await orm(c).batch([
			orm(c).delete(emailFolder).where(eq(emailFolder.folderId, row.folderId)),
			orm(c).delete(folder).where(eq(folder.folderId, row.folderId))
		]);
	},

	//移动邮件，folderId 为 0 表示移回收件箱/已发送
	async move(c, params, userId) {
		await this.ensureTables(c);
		let { emailIds, folderId } = params;
		emailIds = [...new Set((Array.isArray(emailIds) ? emailIds : String(emailIds ?? '').split(','))
			.map(Number).filter(id => id > 0))];
		folderId = Number(folderId) || 0;

		if (emailIds.length === 0) return;
		if (emailIds.length > MOVE_MAX_COUNT) {
			throw new BizError(t('folderMoveLimit', { max: MOVE_MAX_COUNT }));
		}

		if (folderId) {
			await this.selectOwn(c, folderId, userId);
		}

		//只能移动自己的邮件
		const ownRows = await orm(c).select({ emailId: email.emailId }).from(email).where(
			and(inArray(email.emailId, emailIds), eq(email.userId, userId))
		).all();
		const ownIds = ownRows.map(item => item.emailId);
		if (ownIds.length === 0) return;

		if (!folderId) {
			await orm(c).delete(emailFolder).where(inArray(emailFolder.emailId, ownIds)).run();
			return;
		}

		await orm(c).insert(emailFolder)
			.values(ownIds.map(emailId => ({ emailId, folderId, userId })))
			.onConflictDoUpdate({ target: emailFolder.emailId, set: { folderId, userId } })
			.run();
	},

	//文件夹里的邮件列表，按 emailId 倒序分页
	async emailList(c, params, userId) {
		await this.ensureTables(c);
		let { folderId, emailId, size, full } = params;
		const row = await this.selectOwn(c, folderId, userId);
		emailId = Number(emailId) || 0;
		size = Math.min(Number(size) || 20, 50);
		full = Number(full) === 1;
		const columns = full ? emailListColumns : emailBriefColumns;

		const list = await orm(c).select({
			...columns,
			starId: star.starId
		}).from(emailFolder)
			.innerJoin(email, eq(email.emailId, emailFolder.emailId))
			.leftJoin(star, and(eq(star.emailId, email.emailId), eq(star.userId, userId)))
			.where(and(
				eq(emailFolder.folderId, row.folderId),
				eq(emailFolder.userId, userId),
				eq(email.isDel, isDel.NORMAL),
				emailId ? lt(emailFolder.emailId, emailId) : undefined
			))
			.orderBy(desc(emailFolder.emailId))
			.limit(size)
			.all();

		list.forEach(item => {
			item.isStar = item.starId != null ? 1 : 0;
		});

		if (full) {
			await emailService.emailAddAtt(c, list);
		} else {
			emailService.applyListText(list);
		}

		const totalRow = await orm(c).select({ total: count() }).from(emailFolder)
			.innerJoin(email, eq(email.emailId, emailFolder.emailId))
			.where(and(
				eq(emailFolder.folderId, row.folderId),
				eq(emailFolder.userId, userId),
				eq(email.isDel, isDel.NORMAL)
			)).get();
		const total = totalRow?.total || 0;

		return { list, total };
	}
};

export default folderService;
