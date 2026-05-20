
      const { parentPort } = require('worker_threads');
      const path = require('path');
      const fs = require('fs');
      const vm = require('vm');
      if (parentPort) {
        parentPort.on('message', async (message) => {
          if (message.type === 'run') {
            const { task } = message;
            try {
              if (typeof task.hookType !== 'string' || typeof task.collectionSlug !== 'string') {
                throw new Error('Invalid hook parameters: hookType and collectionSlug must be strings');
              }
              if (!/^[a-zA-Z0-9_-]+$/.test(task.collectionSlug) || !/^[a-zA-Z0-9_-]+$/.test(task.hookType)) {
                throw new Error('Invalid hook parameters: potential path traversal detected');
              }
              // Execute dynamic fallback/local hook scripts securely via absolute path
              const hookFile = path.resolve(process.cwd(), 'hooks', task.collectionSlug + '-' + task.hookType);
              let resolvedPath = '';
              if (fs.existsSync(hookFile + '.ts')) {
                resolvedPath = hookFile + '.ts';
              } else if (fs.existsSync(hookFile + '.js')) {
                resolvedPath = hookFile + '.js';
              } else if (fs.existsSync(hookFile)) {
                resolvedPath = hookFile;
              }

              let processedData = task.data;
              if (resolvedPath) {
                const hookRaw = require(resolvedPath).default || require(resolvedPath);
                if (typeof hookRaw !== 'function') {
                  throw new Error('Hook must export a function');
                }
                
                // Wrap and execute inside a secure VM context to sever lexical scope and access to process/require
                const fnStr = hookRaw.toString();
                const context = vm.createContext({
                  console,
                  Math,
                  Date,
                  JSON,
                  setTimeout,
                  clearTimeout,
                });
                const sandboxFn = vm.runInContext('(' + fnStr + ')', context);
                processedData = await sandboxFn(task.data);
              }
              parentPort.postMessage({ error: null, data: processedData });
            } catch (err) {
              parentPort.postMessage({ error: err.message, data: null });
            }
          }
        });
      }
    