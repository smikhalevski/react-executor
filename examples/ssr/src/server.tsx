import * as fs from 'fs';
import { createServer } from 'http';
import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { ExecutorManagerProvider } from 'react-executor';
import { PipeableSSRExecutorManager } from 'react-executor/ssr/node';
import { App } from './App';

const server = createServer();

server.on('request', (request, response) => {
  switch (request.url) {
    case '/':
      const executorManager = new PipeableSSRExecutorManager(response);

      executorManager.getOrCreate('foo', 'okay');

      const stream = renderToPipeableStream(
        <ExecutorManagerProvider value={executorManager}>
          <App />
        </ExecutorManagerProvider>,
        {
          bootstrapScripts: ['client.js'],

          onShellReady() {
            stream.pipe(executorManager.stream);
          },
        }
      );
      break;

    case '/client.js':
      response.end(fs.readFileSync(__dirname + request.url));
      break;

    default:
      response.statusCode = 404;
      response.end();
  }
});

server.listen(7070);
