import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

//用户自定义文件夹
export const folder = sqliteTable('folder', {
	folderId: integer('folder_id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	name: text('name').notNull(),
	sort: integer('sort').default(0).notNull(),
	createTime: text('create_time')
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

//邮件所在的文件夹，一封邮件只在一个文件夹里（email_id 是主键），没有记录就是在收件箱/已发送
export const emailFolder = sqliteTable('email_folder', {
	emailId: integer('email_id').primaryKey(),
	folderId: integer('folder_id').notNull(),
	userId: integer('user_id').notNull(),
});
