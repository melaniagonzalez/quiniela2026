import express from "express";
import serverless from "serverless-http";
import app from "../../server-app";

const functionApp = express();

// Middleware to normalize Netlify function request paths.
// This ensures that whether the endpoint is requested as
// "/api/sync/WC", "/sync/WC" or "/.netlify/functions/api/sync/WC"
// it is mapped cleanly to "/api/sync/WC" inside Express.
functionApp.use((req, res, next) => {
  if (req.url) {
    if (req.url.startsWith("/.netlify/functions/api")) {
      req.url = req.url.replace("/.netlify/functions/api", "/api");
    } else if (!req.url.startsWith("/api")) {
      req.url = "/api" + req.url;
    }
  }
  next();
});

// Mount our main application with its configured routes
functionApp.use(app);

export const handler = serverless(functionApp);
