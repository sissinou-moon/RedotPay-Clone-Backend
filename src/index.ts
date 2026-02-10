import { Hono } from 'hono'
import { auth } from './routes/auth'
import { tonRoute } from './routes/ton'
import { cors } from 'hono/cors';

const app = new Hono()

app.route("/auth", auth);
app.route("/ton", tonRoute);

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.use(
  "*",
  cors({
    origin: "http://localhost:9000",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

export default app
