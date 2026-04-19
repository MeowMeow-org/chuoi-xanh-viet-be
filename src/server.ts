import 'dotenv/config'
import path from 'path'
import http from 'http'
import express from 'express'
import { Server } from 'socket.io'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import { syncResponseMiddleware } from './middlewares/response.middleware'
import router from './routers'
import { setupSwagger } from './config/swagger'
import { corsConfig, getSocketIoAllowedOrigins } from './config/cors'
import { loggerMiddleware } from './middlewares/logger.middleware'
import { registerAnchorEventListeners } from './modules/anchor/anchor.listeners'
import { startAnchorWorker } from './modules/anchor/anchor.worker'
import { startCertificateExpiryWorker } from './modules/certificate/certificate.worker'
import { startInspectionDueWorker } from './modules/inspection/inspection.worker'
import { registerChatSocket } from './modules/chat/chat.socket'

const app = express()
const PORT = Number(process.env.PORT) || 8000

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'development' ? true : getSocketIoAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST']
  }
})
registerChatSocket(io)

app.use(corsConfig)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  next()
})

app.use(loggerMiddleware)

app.use(express.json())
registerAnchorEventListeners()
startAnchorWorker()
startCertificateExpiryWorker()
startInspectionDueWorker()
setupSwagger(app)

app.get('/', (req, res) => {
  res.send('Hello!')
})

/* ======= ROUTES ======= */
//trả về response chuẩn dưới dạng json
app.use(syncResponseMiddleware)
app.use('/v1/api', router)

app.use(express.static(path.join(process.cwd(), 'public')))

/* ======= ERROR HANDLER ======= */

app.use(defaultErrorHandler)

/* ======= START SERVER ======= */

const startServer = async () => {
  try {
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
      console.log(`http://localhost:${PORT}`)
      console.log(`Socket.IO ready (same port, path /socket.io/)`)
    })
  } catch (error) {
    console.error('Error starting server:', error)
    process.exit(1)
  }
}

startServer()
