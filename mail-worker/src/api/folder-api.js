import app from '../hono/hono';
import folderService from '../service/folder-service';
import result from '../model/result';
import userContext from '../security/user-context';

app.get('/folder/list', async (c) => {
	const list = await folderService.list(c, userContext.getUserId(c));
	return c.json(result.ok(list));
});

app.post('/folder/add', async (c) => {
	const row = await folderService.add(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(row));
});

app.put('/folder/rename', async (c) => {
	await folderService.rename(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/folder/sort', async (c) => {
	await folderService.sort(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.delete('/folder/delete', async (c) => {
	await folderService.delete(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/folder/move', async (c) => {
	await folderService.move(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.get('/folder/emails', async (c) => {
	const data = await folderService.emailList(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});
