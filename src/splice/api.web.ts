// Use proxy URL for web version to avoid CORS
export const GRAPHQL_URL = "/api/graphql";

// Re-export all the existing functions and types from the main API file
export * from "./api";

// Override the GRAPHQL_URL for web usage - this ensures the web version uses the proxy
// The proxy is configured in vite.config.web.ts to route /api/graphql to https://surfaces-graphql.splice.com/graphql
