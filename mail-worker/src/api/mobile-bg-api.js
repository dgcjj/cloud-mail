import app from '../hono/hono';
import result from '../model/result';
import mobileBgService from '../service/mobile-bg-service';

//路径以 /setting/setBackground、/setting/deleteBackground 开头，沿用系统设置权限
app.put('/setting/setBackgroundMobile', async (c) => {
	const key = await mobileBgService.set(c, await c.req.json());
	return c.json(result.ok(key));
});

app.delete('/setting/deleteBackgroundMobile', async (c) => {
	await mobileBgService.delete(c);
	return c.json(result.ok());
});
