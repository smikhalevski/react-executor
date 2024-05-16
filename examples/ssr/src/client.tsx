import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { enableSSRHydration, ExecutorManager, ExecutorManagerProvider } from 'react-executor';
import { App } from './App';

const executorManager = new ExecutorManager();

enableSSRHydration(executorManager);

hydrateRoot(
  document,
  <ExecutorManagerProvider value={executorManager}>
    <App />
  </ExecutorManagerProvider>
);
