import {createApp} from './app';
import {createDb} from './db/knex';

const port = Number(process.env.PORT ?? 3001);
const db = createDb();
const app = createApp(db, process.env.CLIENT_DIST);

const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

const shutdown = () => server.close(() => db.destroy().then(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
