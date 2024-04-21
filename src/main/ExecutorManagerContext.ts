import { createContext } from 'react';
import { ExecutorManager } from './ExecutorManager';

export const ExecutorManagerContext = createContext(new ExecutorManager());
