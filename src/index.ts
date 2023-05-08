import { Hono } from 'hono'
import Key from './handler/key'
const app = new Hono()

app.get('/', (c) => c.text('Hello World!'))
app.route('/key', Key)

export default app