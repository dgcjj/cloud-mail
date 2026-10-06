import BizError from '../error/biz-error';

//AI 写信配置保存在 KV，不改数据库表结构，避免和上游的 init.js 迁移冲突
const CONFIG_KEY = 'ai-compose-config';
const DEFAULT_WORKERS_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const MAX_INPUT = 8000;

const PROVIDER = {
	WORKERS: 'workers',
	CUSTOM: 'custom'
};

const MODES = ['draft', 'reply', 'polish', 'translate'];

const TONES = {
	formal: 'formal and professional',
	friendly: 'warm and friendly',
	concise: 'short and to the point',
	polite: 'polite and tactful'
};

const LANGS = {
	zh: 'Simplified Chinese',
	en: 'English',
	fr: 'French',
	ja: 'Japanese',
	ko: 'Korean',
	es: 'Spanish',
	de: 'German'
};

const defaultConfig = {
	enabled: true,
	provider: PROVIDER.WORKERS,
	workersModel: '',
	baseUrl: '',
	apiKey: '',
	model: '',
	fallback: true
};

const aiComposeService = {

	async getConfig(c) {
		const config = await c.env.kv.get(CONFIG_KEY, { type: 'json' });
		return { ...defaultConfig, ...(config || {}) };
	},

	//给管理页用，key 打码
	async query(c) {
		const config = await this.getConfig(c);
		config.apiKey = config.apiKey ? `${config.apiKey.slice(0, 6)}******` : '';
		config.hasAi = !!c.env.ai;
		config.defaultWorkersModel = c.env.ai_model || DEFAULT_WORKERS_MODEL;
		return config;
	},

	async set(c, params) {
		const config = await this.getConfig(c);

		if (typeof params.enabled === 'boolean') config.enabled = params.enabled;
		if (typeof params.fallback === 'boolean') config.fallback = params.fallback;
		if (Object.values(PROVIDER).includes(params.provider)) config.provider = params.provider;
		if (typeof params.workersModel === 'string') config.workersModel = params.workersModel.trim();
		if (typeof params.model === 'string') config.model = params.model.trim();
		if (typeof params.baseUrl === 'string') config.baseUrl = params.baseUrl.trim().replace(/\/+$/, '');
		//打码的旧值原样传回来时不覆盖
		if (typeof params.apiKey === 'string' && !params.apiKey.endsWith('******')) config.apiKey = params.apiKey.trim();

		if (config.provider === PROVIDER.CUSTOM && (!config.baseUrl || !config.model)) {
			throw new BizError('Custom model requires Base URL and model name');
		}

		await c.env.kv.put(CONFIG_KEY, JSON.stringify(config));
	},

	async status(c) {
		const config = await this.getConfig(c);
		const usable = config.provider === PROVIDER.CUSTOM ? !!config.baseUrl : !!c.env.ai;
		return { enabled: config.enabled && usable };
	},

	//返回 { stream, model }，stream 是纯文本流
	async compose(c, params) {
		const config = await this.getConfig(c);

		if (!config.enabled) {
			throw new BizError('AI compose is disabled', 403);
		}

		const messages = this.buildMessages(params);
		const temperature = ['polish', 'translate'].includes(params.mode) ? 0.3 : 0.7;

		if (config.provider === PROVIDER.CUSTOM) {
			try {
				return await this.runCustom(config, messages, temperature);
			} catch (e) {
				if (!config.fallback || !c.env.ai) throw e;
				console.warn('自定义模型调用失败，回退到 Workers AI: ', e.message);
			}
		}

		return await this.runWorkers(c, config, messages, temperature);
	},

	async runWorkers(c, config, messages, temperature) {
		if (!c.env.ai) {
			throw new BizError('Workers AI is not bound');
		}

		const model = config.workersModel || c.env.ai_model || DEFAULT_WORKERS_MODEL;
		const sse = await c.env.ai.run(model, {
			messages,
			temperature,
			max_tokens: 1024,
			stream: true
		});

		return { stream: sse.pipeThrough(sseToText()), model };
	},

	async runCustom(config, messages, temperature) {
		const headers = { 'Content-Type': 'application/json' };
		if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

		const res = await fetch(`${config.baseUrl}/chat/completions`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: config.model,
				messages,
				temperature,
				max_tokens: 1024,
				stream: true
			})
		});

		if (!res.ok || !res.body) {
			const text = await res.text().catch(() => '');
			throw new BizError(`AI ${res.status}: ${text.slice(0, 300)}`);
		}

		return { stream: res.body.pipeThrough(sseToText()), model: config.model };
	},

	buildMessages(params) {
		const mode = MODES.includes(params.mode) ? params.mode : 'draft';
		const instruction = clip(params.instruction);
		const text = clip(params.text);
		const tone = TONES[params.tone];
		const lang = LANGS[params.lang];
		const senderName = clip(params.senderName, 100);

		const rules = [
			'Output plain text only. No Markdown, no code fences, no explanations, no notes about what you did.',
			'Separate paragraphs with a blank line.'
		];

		let system;
		let user;

		if (mode === 'draft' || mode === 'reply') {
			rules.push('Do not add a signature block, contact details or placeholders such as [Your Name]. End with a short closing line only' + (senderName ? `, optionally followed by the sender name "${senderName}".` : '.'));
			if (tone) rules.push(`Tone: ${tone}.`);
		}

		if (mode === 'draft') {
			if (!instruction) throw new BizError('Please describe what the email should say');
			system = 'You are an assistant that writes emails for the user.';
			rules.push('The first line must be "Subject: <subject>", followed by a blank line, then the email body.');
			rules.push(lang ? `Write in ${lang}.` : 'Write in the same language as the user\'s instructions.');
			user = `Write an email based on these instructions:\n${instruction}`;
			if (text) user += `\n\nExisting draft (improve or continue it):\n${text}`;
		}

		if (mode === 'reply') {
			const original = params.original || {};
			const originalText = clip(original.text, 6000);
			if (!originalText) throw new BizError('Original email is empty');
			system = 'You are an assistant that writes email replies for the user.';
			rules.push('Write only the reply body. Do not repeat the subject or quote the original email.');
			rules.push(lang ? `Write in ${lang}.` : 'Write in the same language as the original email.');
			user = `Original email\nFrom: ${clip(original.from, 200)}\nSubject: ${clip(original.subject, 300)}\n\n${originalText}\n\n---\n`;
			user += instruction ? `Write a reply. What the reply should say:\n${instruction}` : 'Write an appropriate reply.';
			if (text) user += `\n\nExisting reply draft (improve or continue it):\n${text}`;
		}

		if (mode === 'polish') {
			if (!text) throw new BizError('Please select the text to polish');
			system = 'You are an editor who improves email writing.';
			rules.push('Fix grammar and wording, keep the original meaning, facts and language. Return only the rewritten text.');
			if (tone) rules.push(`Tone: ${tone}.`);
			if (instruction) rules.push(`Extra requirements: ${instruction}`);
			user = text;
		}

		if (mode === 'translate') {
			if (!text) throw new BizError('Please select the text to translate');
			system = 'You are a professional translator for emails.';
			rules.push(lang ? `Translate into ${lang}.` : 'If the text is Chinese, translate it into English; otherwise translate it into Simplified Chinese.');
			rules.push('Keep names, email addresses, numbers and links unchanged. Return only the translation.');
			if (instruction) rules.push(`Extra requirements: ${instruction}`);
			user = text;
		}

		return [
			{ role: 'system', content: `${system}\n${rules.map(item => `- ${item}`).join('\n')}` },
			{ role: 'user', content: user }
		];
	}
};

function clip(value, max = MAX_INPUT) {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

//把 SSE（Workers AI 的 {response} 或 OpenAI 兼容的 {choices[0].delta.content}）转成纯文本流
function sseToText() {
	const decoder = new TextDecoder();
	const encoder = new TextEncoder();
	let buffer = '';

	const handleLine = (line, controller) => {
		line = line.trim();
		if (!line.startsWith('data:')) return;
		const data = line.slice(5).trim();
		if (!data || data === '[DONE]') return;
		try {
			const json = JSON.parse(data);
			const piece = json.response ?? json.choices?.[0]?.delta?.content ?? '';
			if (piece) controller.enqueue(encoder.encode(piece));
		} catch (e) {
			//不完整或非 JSON 的行直接忽略
		}
	};

	return new TransformStream({
		transform(chunk, controller) {
			buffer += decoder.decode(chunk, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop();
			lines.forEach(line => handleLine(line, controller));
		},
		flush(controller) {
			buffer += decoder.decode();
			if (buffer) handleLine(buffer, controller);
		}
	});
}

export default aiComposeService;
