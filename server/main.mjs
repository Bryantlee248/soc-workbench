import { createServer } from './server.mjs';
const port = Number(process.env.PORT || 3000);
createServer().listen(port, () => console.log('soc-workbench server on http://127.0.0.1:' + port));
