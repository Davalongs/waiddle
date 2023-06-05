import { Hono } from 'hono'
import Key from './handler/key'
import Ping from './handler/ping'
const app = new Hono()

app.get('/', (c) => c.text('Hello World!'))
app.route('/key', Key)
app.route('/ping', Ping)

export default app