import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from Node.js TypeScript Backend' });
});

export default app;

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
