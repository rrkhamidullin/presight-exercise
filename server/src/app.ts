import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, {NextFunction, Request, Response} from 'express';
import type {Knex} from 'knex';
import {BadRequestError, parseFilters, parseListParams} from './users/params';
import {getFacets, listUsers} from './users/repository';

export function createApp(db: Knex, clientDist?: string) {
    const app = express();
    app.use(cors());

    app.get('/api/health', (_req, res) => {
        res.json({ok: true});
    });

    app.get('/api/users', async (req, res) => {
        res.json(await listUsers(db, parseListParams(req.query)));
    });

    app.get('/api/users/facets', async (req, res) => {
        res.json(await getFacets(db, parseFilters(req.query)));
    });

    app.use('/api', (_req, res) => {
        res.status(404).json({error: 'Not found'});
    });

    if (clientDist && fs.existsSync(clientDist)) {
        app.use(express.static(clientDist));
        app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
    }

    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        if (err instanceof BadRequestError) {
            res.status(400).json({error: err.message});
            return;
        }
        console.error(err);
        res.status(500).json({error: 'Internal server error'});
    });

    return app;
}
