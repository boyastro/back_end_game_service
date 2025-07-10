import express from "express";
import websocketRoutes from "./routes/websocket.routes.js";

const app = express();
app.use(express.json());

app.use("/", websocketRoutes);

export default app;
