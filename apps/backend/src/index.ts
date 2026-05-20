import Fastify from 'fastify';

const app = Fastify({ logger: true });

const PORT = parseInt(process.env.PORT || '3000', 10);

app.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export { app };
