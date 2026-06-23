const { createHmac } = require('crypto');
const secret = process.env.PLATFORM_HMAC_SECRET || process.env.MEMORY_SERVICE_SECRET || 'memos-dev-secret';
console.log(secret);
const payload = `agent_94223efc:0x4b19893f92693d16e2e4268505509354a10e7a76`;
const hmac = createHmac('sha256', secret).update(payload).digest('hex');
console.log(`mos_${hmac.slice(0, 32)}`);
