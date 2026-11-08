'use strict';

/**
 * WallpaperHub Morocco — public, read-only MCP knowledge server.
 *
 * Tools exposed to ChatGPT:
 *   - search(query): search approved public help articles.
 *   - fetch(id): read one approved public help article.
 *
 * No Supabase client, account token, private message, publish, edit, or delete
 * capability is used in this module.
 */

const path = require('path');
const fs = require('fs');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge', 'wallpaperhub-knowledge.json');
const PUBLIC_BASE_URL = 'https://wallpaperhub-morocco.vercel.app';

function loadKnowledge() {
  const raw = fs.readFileSync(KNOWLEDGE_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.articles)) {
    throw new Error('WallpaperHub knowledge file must contain an articles array.');
  }
  return parsed.articles;
}

const articles = loadKnowledge();
const articlesById = new Map(articles.map((article) => [article.id, article]));

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('ar')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function scoreArticle(article, query) {
  const normalizedQuery = normalizeText(query);
  const title = normalizeText(article.title);
  const keywords = normalizeText((article.keywords || []).join(' '));
  const body = normalizeText(article.text);
  const searchable = `${title} ${keywords} ${body}`;
  let score = 0;

  if (normalizedQuery.length >= 3 && title.includes(normalizedQuery)) score += 12;
  if (normalizedQuery.length >= 3 && keywords.includes(normalizedQuery)) score += 9;
  if (normalizedQuery.length >= 3 && body.includes(normalizedQuery)) score += 5;

  for (const token of tokenize(query)) {
    if (title.includes(token)) score += 5;
    else if (keywords.includes(token)) score += 4;
    else if (searchable.includes(token)) score += 1;
  }

  return score;
}

function searchArticles(query) {
  const cleanQuery = String(query || '').trim();
  if (cleanQuery.length < 2 || cleanQuery.length > 400) return [];

  return articles
    .map((article) => ({ article, score: scoreArticle(article, cleanQuery) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ article }) => ({
      id: article.id,
      title: article.title,
      url: article.url
    }));
}

function createMcpServer() {
  const server = new McpServer(
    { name: 'wallpaperhub-morocco', version: '0.1.0' },
    {
      instructions: [
        'You are the official public help knowledge source for WallpaperHub Morocco.',
        'Use search(query) first to find relevant public help articles, then fetch(id) to read the relevant articles.',
        'Answer only with facts supported by fetched articles. Include the returned source URLs as links.',
        'If the knowledge base does not document something, say so and direct the user to the support page.',
        'This server provides public help content only. It cannot access account-specific information, private messages, private forums, saved favourites, personal submissions, or user records.',
        'Never ask users for passwords, one-time codes, API keys, or secret tokens.',
        'There are no tools for publishing, editing, deleting, or changing WallpaperHub data.'
      ].join(' ')
    }
  );

  server.registerTool(
    'search',
    {
      title: 'Search WallpaperHub help',
      description: 'Search official public WallpaperHub Morocco help articles and return relevant article IDs, titles, and source URLs.',
      inputSchema: {
        query: z.string().min(2).max(400).describe('The user question or search phrase, in Arabic, Darija, French, or English.')
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },
    async ({ query }) => {
      const results = searchArticles(query);
      return {
        content: [{ type: 'text', text: JSON.stringify({ results }) }]
      };
    }
  );

  server.registerTool(
    'fetch',
    {
      title: 'Read a WallpaperHub help article',
      description: 'Read the full text of one public WallpaperHub Morocco help article by its ID.',
      inputSchema: {
        id: z.string().min(1).max(100).describe('The article ID returned by the search tool.')
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },
    async ({ id }) => {
      const article = articlesById.get(String(id).trim());
      if (!article) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: 'Article not found. Search the public help knowledge base first.' })
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: article.id,
            title: article.title,
            text: article.text,
            url: article.url,
            metadata: {
              language: article.language || 'ar',
              source: 'WallpaperHub Morocco public help knowledge base'
            }
          })
        }]
      };
    }
  );

  return server;
}

function registerWallpaperHubMcp(app) {
  if (!app || typeof app.post !== 'function') {
    throw new TypeError('registerWallpaperHubMcp expects an Express app.');
  }

  app.get('/mcp/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json({
      status: 'ok',
      service: 'WallpaperHub Morocco public help MCP',
      version: '0.1.0',
      tools: ['search', 'fetch'],
      access: 'public-read-only'
    });
  });

  app.post('/mcp', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    let server;
    let transport;

    try {
      server = createMcpServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('WALLPAPERHUB MCP REQUEST ERROR:', error && error.message ? error.message : 'Unknown error');
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'WallpaperHub help service could not process this request.' },
          id: null
        });
      }
    } finally {
      try {
        if (transport && typeof transport.close === 'function') await transport.close();
      } catch (_) {}
      try {
        if (server && typeof server.close === 'function') await server.close();
      } catch (_) {}
    }
  });

  app.get('/mcp', (_req, res) => {
    res.set('Allow', 'POST');
    res.set('Cache-Control', 'no-store');
    return res.status(405).json({
      error: 'This stateless MCP endpoint accepts POST requests only.'
    });
  });

  app.delete('/mcp', (_req, res) => {
    res.set('Allow', 'POST');
    return res.status(405).json({
      error: 'This stateless MCP endpoint does not use sessions.'
    });
  });
}

module.exports = registerWallpaperHubMcp;
