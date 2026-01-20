import http from "node:http";

const PORT = process.env.PORT || 8787;

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
};

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/process") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const payload = JSON.parse(body || "{}");
      const jobId = payload.job_id;
      const url = payload.url;
      const callbackUrl = payload.callback_url;
      const callbackToken = payload.callback_token;

      if (!jobId || !url || !callbackUrl) {
        sendJson(res, 400, { error: "job_id, url, and callback_url are required" });
        return;
      }

      sendJson(res, 202, { accepted: true, job_id: jobId });

      const callbackPayload = {
        job_id: jobId,
        status: "failed",
        error_code: "ERR_NOT_IMPLEMENTED",
        error_message: "Worker stub running. Replace with yt-dlp/gallery-dlp implementation.",
        output_items: [],
        meta: { worker: "stub" },
      };

      await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(callbackToken ? { "x-callback-token": callbackToken } : {}),
        },
        body: JSON.stringify(callbackPayload),
      });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid JSON" });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Worker stub listening on :${PORT}`);
});
