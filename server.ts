import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db.js';
import { seedInitialDataIfNeeded } from './server/seed.js';

import tasksRouter from './server/routes/tasks.js';
import projectsRouter from './server/routes/projects.js';
import packagesRouter from './server/routes/packages.js';
import categoriesRouter from './server/routes/categories.js';
import tagsRouter from './server/routes/tags.js';
import usersRouter from './server/routes/users.js';
import dashboardRouter from './server/routes/dashboard.js';
import attachmentsRouter from './server/routes/attachments.js';
import systemRouter from './server/routes/system.js';
import aiRouter from './server/routes/ai.js';
import outlookRouter from './server/routes/outlook.js';
import picsRouter from './server/routes/pics.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite database and check seed data
  try {
    await getDb();
    seedInitialDataIfNeeded();
    console.log('Database initialized and verified successfully.');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Alias for database download backup
  app.get('/api/database/backup', (req, res) => {
    res.redirect('/api/system/download-db');
  });

  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/packages', packagesRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/attachments', attachmentsRouter);
  app.use('/api/system', systemRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/outlook', outlookRouter);
  app.use('/api/auth/outlook', outlookRouter);
  app.use('/api/pics', picsRouter);

  // Vite middleware for development vs Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Engineering Task Manager server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
