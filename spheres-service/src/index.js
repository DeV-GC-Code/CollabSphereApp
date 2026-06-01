import "dotenv/config";
import express from "express";
import cors from "cors";
import spheresRouter from "./routes/spheres.js";

const app = express();
const PORT = process.env.PORT || 8009;

app.use(cors());
app.use(express.json());

// Health check (Eureka + gateway use this)
app.get("/actuator/health", (_req, res) => res.json({ status: "UP" }));

// Routes — gateway strips /api/v1/spheres, so paths here are /core/...
app.use("/core", spheresRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[error]", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[spheres-service] Listening on :${PORT}`);
  registerWithEureka();
});

// ── Eureka self-registration ──────────────────────────────────────
async function registerWithEureka() {
  const host = process.env.EUREKA_HOST || "localhost";
  const port = process.env.EUREKA_PORT || 8761;
  const serviceHost = process.env.SERVICE_HOST || "localhost";
  const servicePort = Number(process.env.SERVICE_PORT || PORT);
  const instanceId = `${serviceHost}:spheres-service:${servicePort}`;

  const body = {
    instance: {
      instanceId,
      hostName: serviceHost,
      app: "SPHERES-SERVICE",
      ipAddr: serviceHost,
      status: "UP",
      port: { $: servicePort, "@enabled": "true" },
      vipAddress: "spheres-service",
      secureVipAddress: "spheres-service",
      metadata: { "management.port": String(servicePort) },
      dataCenterInfo: { "@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo", name: "MyOwn" },
      healthCheckUrl: `http://${serviceHost}:${servicePort}/actuator/health`,
      statusPageUrl: `http://${serviceHost}:${servicePort}/actuator/health`,
      homePageUrl: `http://${serviceHost}:${servicePort}/`,
    },
  };

  try {
    const res = await fetch(`http://${host}:${port}/eureka/apps/SPHERES-SERVICE`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok || res.status === 204) {
      console.log("[spheres-service] Registered with Eureka");
      setInterval(() => renewEurekaLease(host, port, instanceId), 25_000).unref();
    } else {
      console.warn("[spheres-service] Eureka registration responded:", res.status);
    }
  } catch (err) {
    console.warn("[spheres-service] Eureka not reachable:", err.message);
  }
}

async function renewEurekaLease(host, port, instanceId) {
  try {
    const res = await fetch(`http://${host}:${port}/eureka/apps/SPHERES-SERVICE/${instanceId}`, {
      method: "PUT",
    });
    if (!res.ok && res.status !== 204) {
      console.warn("[spheres-service] Eureka heartbeat responded:", res.status);
    }
  } catch (err) {
    console.warn("[spheres-service] Eureka heartbeat failed:", err.message);
  }
}
