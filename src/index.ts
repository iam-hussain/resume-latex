import express, { Request, Response } from 'express'
import path from 'path'
import { buildPdf, renderHtml, renderXml } from './latex'

interface AppConfig {
    port: number
    defaultSource: string
}

const DEFAULT_PORT = 3000
const DEFAULT_SOURCE = process.env.TEX_SOURCE ?? 'full_stack_ai.tex'

function parsePort(rawPort?: string): number {
    const parsed = Number(rawPort)
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed
    }
    return DEFAULT_PORT
}

function resolveSourceFromQuery(req: Request, defaultSource: string): string {
    const candidate = typeof req.query.src === 'string' && req.query.src.length > 0
        ? req.query.src
        : defaultSource
    return path.resolve(process.cwd(), candidate)
}

export function createApp(config: AppConfig): express.Express {
    const app = express()
    app.use(express.json())

    app.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok' })
    })

    app.get('/', (_req: Request, res: Response) => {
        res.json({ message: 'Resume service ready', defaultSource: config.defaultSource })
    })

    app.get('/html', async (req: Request, res: Response) => {
        const sourcePath = resolveSourceFromQuery(req, config.defaultSource)
        try {
            const html = await renderHtml({ sourcePath })
            res.type('html').send(html)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to render HTML', details: (error as Error).message })
        }
    })

    app.get('/xml', async (req: Request, res: Response) => {
        const sourcePath = resolveSourceFromQuery(req, config.defaultSource)
        try {
            const xml = await renderXml({ sourcePath })
            res.type('application/xml').send(xml)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to render XML', details: (error as Error).message })
        }
    })

    app.get('/pdf', async (req: Request, res: Response) => {
        const sourcePath = resolveSourceFromQuery(req, config.defaultSource)
        try {
            const pdfPath = await buildPdf({ sourcePath })
            res.sendFile(pdfPath)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Failed to generate PDF', details: (error as Error).message })
        }
    })

    return app
}

export function startServer(config: AppConfig): void {
    const app = createApp(config)
    app.listen(config.port, () => {
        console.log(`Server listening on port ${config.port}`)
    })
}

if (require.main === module) {
    const port = parsePort(process.env.PORT)
    startServer({ port, defaultSource: DEFAULT_SOURCE })
}

