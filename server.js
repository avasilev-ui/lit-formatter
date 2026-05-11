/**
 * Локальный сервер: раздаёт страницу и запрашивает метаданные PubMed по PMID (NCBI E-utilities).
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "lit-formatter/1.0 (local; research)" } }, (r) => {
        let data = "";
        r.on("data", (c) => {
          data += c;
        });
        r.on("end", () => {
          if (r.statusCode && r.statusCode >= 400) {
            reject(new Error(`HTTP ${r.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function parsePubmedSummary(uid, article) {
  if (!article || article.error) {
    return { uid, error: article?.error || "нет данных" };
  }

  const rawTitle = (article.title || "").trim();
  const title = rawTitle.replace(/\.\s*$/, "");

  const pubdate = article.pubdate || "";
  const sortpub = article.sortpubdate || "";
  const yearMatch = pubdate.match(/\b(19\d{2}|20\d{2})\b/) || sortpub.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : "";

  const firstName =
    (article.authors && article.authors[0] && article.authors[0].name) || article.sortfirstauthor || "";
  const author = firstName.split(/\s+/)[0] || "";

  const journal = (article.source || article.fulljournalname || "").trim();

  return {
    uid,
    title,
    author,
    year,
    journal,
    pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`
  };
}

async function handlePubmedByPmid(pmids) {
  const ids = pmids
    .map((id) => String(id).trim())
    .filter((id) => /^\d+$/.test(id));

  if (!ids.length) {
    return { ok: false, error: "Укажи хотя бы один числовой PMID." };
  }

  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(
    ids.join(",")
  )}&retmode=json`;

  const data = await httpsGetJson(url);
  const result = data && data.result;
  if (!result || !Array.isArray(result.uids)) {
    return { ok: false, error: "Неожиданный ответ PubMed." };
  }

  const items = result.uids.map((uid) => parsePubmedSummary(uid, result[uid]));
  const errors = items.filter((i) => i.error);
  const okItems = items.filter((i) => !i.error);

  return {
    ok: okItems.length > 0,
    items: okItems,
    errors: errors.length ? errors : undefined
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 2e6) {
        reject(new Error("payload too large"));
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function safeResolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = decoded === "/" ? "index.html" : decoded.replace(/^\//, "");
  const abs = path.normalize(path.join(ROOT, rel));
  if (!abs.startsWith(ROOT)) return null;
  return abs;
}

function serveStatic(req, res) {
  const abs = safeResolvePath(new URL(req.url, "http://localhost").pathname);
  if (!abs) {
    res.writeHead(403);
    res.end();
    return;
  }

  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(abs).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(abs).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || "/", `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  if (req.method === "POST" && u.pathname === "/api/pubmed-by-pmid") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const list =
        typeof body.pmids === "string"
          ? body.pmids.split(/[,\s]+/)
          : Array.isArray(body.pmids)
            ? body.pmids
            : body.pmid != null
              ? [String(body.pmid)]
              : [];

      const out = await handlePubmedByPmid(list);
      sendJson(res, out.ok ? 200 : 400, out);
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e.message || "Ошибка сервера" });
    }
    return;
  }

  if (req.method === "GET" && u.pathname === "/api/pubmed-by-pmid") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const q = u.searchParams.get("pmid") || u.searchParams.get("pmids") || "";
      const list = q.split(/[,\s]+/).filter(Boolean);
      const out = await handlePubmedByPmid(list);
      sendJson(res, out.ok ? 200 : 400, out);
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e.message || "Ошибка сервера" });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Открой в браузере: http://localhost:${PORT}/`);
});
