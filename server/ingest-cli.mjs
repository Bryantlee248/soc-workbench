import { ingestWazuh } from './ingest-wazuh.mjs';
const n = ingestWazuh();
console.log('ingested:', n, 'alerts');
