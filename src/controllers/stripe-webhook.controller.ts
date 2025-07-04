import { Request, Response } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import User from "../model/user.js";
import Item from "../model/item.js";
dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-06-30.basil",
});

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"]!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Xử lý event thành công
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    // Log chi tiết thông tin nhận được từ webhook
    console.log("[Stripe Webhook] payment_intent.succeeded", {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      userId: paymentIntent.metadata?.userId,
      itemId: paymentIntent.metadata?.itemId,
      metadata: paymentIntent.metadata,
    });
    // Giả định metadata có userId và itemId
    const userId = paymentIntent.metadata?.userId;
    const itemId = paymentIntent.metadata?.itemId;
    if (userId && itemId) {
      try {
        const user = await User.findById(userId);
        const item = await Item.findById(itemId);
        if (!user) {
          console.error("[Stripe Webhook] Không tìm thấy user:", userId);
        }
        if (!item) {
          console.error("[Stripe Webhook] Không tìm thấy item:", itemId);
        }
        if (user && item) {
          console.log(
            "[Stripe Webhook] Inventory trước khi cập nhật:",
            user.inventory
          );
          const invItem = user.inventory.find(
            (i: any) =>
              (i.item && i.item.toString() === itemId) ||
              (i._id && i._id.toString() === itemId)
          );
          if (invItem) {
            invItem.quantity += 1;
          } else {
            user.inventory.push({ item: item._id, quantity: 1 });
          }
          await user.save();
          console.log(
            "[Stripe Webhook] Inventory sau khi cập nhật:",
            user.inventory
          );
        }
      } catch (err) {
        // Log lỗi nếu cần
      }
    }
  }

  res.json({ received: true });
};
