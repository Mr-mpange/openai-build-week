import http from "node:http";

import app from "./src/server";

const port = Number.parseInt(process.env.PORT ?? "8080", 10);

function toRequest(req: http.IncomingMessage): Request {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);
  const init: RequestInit = {
    method: req.method,
    headers: req.headers as HeadersInit,
  };

  if (req.method && !["GET", "HEAD"].includes(req.method)) {
    init.body = req;
    // Node fetch requires duplex when streaming a request body.
    (init as RequestInit & { duplex?: "half" }).duplex = "half";
  }

  return new Request(url, init);
}

function writeResponse(res: http.ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  const pump = (): void => {
    reader.read().then(({ done, value }) => {
      if (done) {
        res.end();
        return;
      }
      res.write(Buffer.from(value));
      pump();
    }).catch((error) => {
      res.destroy(error);
    });
  };
  pump();
}

const server = http.createServer((req, res) => {
  if (!req.url || !req.method) {
    res.statusCode = 400;
    res.end("Bad request");
    return;
  }

  void app.fetch(toRequest(req), {}, {}).then((response) => {
    writeResponse(res, response);
  }).catch((error) => {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal server error");
  });
});

server.listen(port, () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
});
