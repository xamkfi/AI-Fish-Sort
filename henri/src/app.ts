import express, { type Request, type Response, type NextFunction } from 'express';

export const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Hello from Express' });
});

app.get('/users/:id', async (req, res) => {
  // Express 5 forwards rejected promises to the error handler automatically
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'id must be a number' });
    return;
  }
  res.json({ id, name: 'Example User' });
});

// 404: runs when no route above matched
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler: Express recognizes it by the four parameters
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});