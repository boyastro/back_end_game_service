import { Request, Response } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-06-30.basil",
});

export const createPaymentIntent = async (req: Request, res: Response) => {
  const { amount, currency, userId, itemId } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ["card"],
      metadata: {
        integration_check: "in-app-purchase",
        userId: userId || "",
        itemId: itemId || "",
      },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
