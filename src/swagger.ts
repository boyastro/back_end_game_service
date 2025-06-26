import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Game API",
      version: "1.0.0",
    },
  },
  apis: ["./src/routes/*.{ts,js}", "./dist/routes/*.js"], // Đảm bảo swagger đọc được cả khi chạy dev và production
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
