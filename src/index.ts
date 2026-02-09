import { Hono } from 'hono'
import { auth } from './routes/auth'
import { tonRoute } from './routes/ton'

const app = new Hono()

app.route("/auth", auth);
app.route("/ton", tonRoute);

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
