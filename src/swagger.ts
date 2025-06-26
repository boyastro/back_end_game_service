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
  apis: ["./src/routes/*.ts"], // hoặc chỉ định file chứa swagger comment
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
