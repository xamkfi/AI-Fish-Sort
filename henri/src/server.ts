import { app } from './app.ts';

const PORT = Number(process.env.PORT) || 3000;

// Express 5 passes listen errors (e.g. EADDRINUSE) to this callback
const server = app.listen(PORT, (error) => {
  if (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Graceful shutdown: stop accepting connections, finish open requests
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});