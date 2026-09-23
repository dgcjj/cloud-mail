import app from '../hono/hono';
import signatureService from '../service/signature-service';
import result from '../model/result';
import userContext from '../security/user-context';

app.get('/signature/list', async (c) => {
	const map = await signatureService.list(c, userContext.getUserId(c));
	return c.json(result.ok(map));
});

app.put('/signature/set', async (c) => {
	const signature = await signatureService.set(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(signature));
});
