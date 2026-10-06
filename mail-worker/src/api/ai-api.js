import app from '../hono/hono';
import result from '../model/result';
import aiComposeService from '../service/ai-compose-service';

app.get('/ai/status', async (c) => {
	return c.json(result.ok(await aiComposeService.status(c)));
});

//返回纯文本流，前端用 fetch 逐段读取
app.post('/ai/compose', async (c) => {
	const { stream, model } = await aiComposeService.compose(c, await c.req.json());
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'no-cache',
			'X-AI-Model': encodeURIComponent(model),
			'Access-Control-Expose-Headers': 'X-AI-Model'
		}
	});
});

//路径以 /setting/query、/setting/set 开头，沿用系统设置的权限
app.get('/setting/queryAiCompose', async (c) => {
	return c.json(result.ok(await aiComposeService.query(c)));
});

app.put('/setting/setAiCompose', async (c) => {
	await aiComposeService.set(c, await c.req.json());
	return c.json(result.ok());
});
