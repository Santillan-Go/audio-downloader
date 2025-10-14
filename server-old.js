import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from dist-web
app.use(express.static(path.join(__dirname, "dist-web")));

// Proxy for Splice GraphQL API
app.use(
  "/api/graphql",
  createProxyMiddleware({
    target: "https://surfaces-graphql.splice.com/graphql",
    changeOrigin: true,
    pathRewrite: {
      "^/api/graphql": "",
    },
    headers: {
      Origin: "https://splice.com",
      Referer: "https://splice.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(
        `[GraphQL Proxy] ${req.method} ${req.url} -> ${proxyReq.getHeader(
          "host"
        )}${proxyReq.path}`
      );
    },
    onError: (err, req, res) => {
      console.error("[GraphQL Proxy Error]", err);
      res.status(500).send("Proxy Error");
    },
  })
);

// Proxy for S3 audio files
app.use(
  "/api/s3",
  createProxyMiddleware({
    target: "https://spliceproduction.s3.us-west-1.amazonaws.com",
    changeOrigin: true,
    pathRewrite: {
      "^/api/s3": "",
    },
    headers: {
      Origin: "https://splice.com",
      Referer: "https://splice.com/",
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(
        `[S3 Proxy] ${req.method} ${req.url} -> ${proxyReq.getHeader("host")}${
          proxyReq.path
        }`
      );
    },
    onError: (err, req, res) => {
      console.error("[S3 Proxy Error]", err);
      res.status(500).send("Proxy Error");
    },
  })
);

// SPA fallback - serve index.web.html for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist-web", "index.web.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
