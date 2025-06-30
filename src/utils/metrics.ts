import client from "prom-client";

export const usersOnlineGauge = new client.Gauge({
  name: "app_users_online",
  help: "Current number of online users",
});

// You can export more custom metrics here
