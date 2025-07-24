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
  console.log("[Stripe Webhook] Nhận request webhook:", {
    headers: req.headers,
    body: req.body,
  });
  const sig = req.headers["stripe-signature"]!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("[Stripe Webhook] Xác thực chữ ký webhook thành công.");
  } catch (err: any) {
    console.error("[Stripe Webhook] Lỗi xác thực webhook:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  console.log("[Stripe Webhook] Nhận event:", event.type);

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
    const userId = paymentIntent.metadata?.userId;
    const itemId = paymentIntent.metadata?.itemId;
    const coinAmount = paymentIntent.metadata?.amount;
    // Nếu có itemId: giao dịch mua vật phẩm
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
          let quantity = 1;
          if (paymentIntent.metadata && paymentIntent.metadata.quantity) {
            const q = parseInt(paymentIntent.metadata.quantity, 10);
            if (!isNaN(q) && q > 0) quantity = q;
          }
          const invItem = user.inventory.find(
            (i: any) =>
              (i.item && i.item.toString() === itemId) ||
              (i._id && i._id.toString() === itemId)
          );
          if (invItem) {
            invItem.quantity += quantity;
          } else {
            user.inventory.push({ item: item._id, quantity });
          }
          await user.save();
        }
      } catch (err) {
        console.error("[Stripe Webhook] Lỗi khi cập nhật kho:", err);
      }
    }
    // Nếu có coinAmount: giao dịch mua coin
    else if (userId && coinAmount) {
      try {
        const user = await User.findById(userId);
        const coin = parseInt(coinAmount, 10);
        if (!user) {
          console.error("[Stripe Webhook] Không tìm thấy user:", userId);
        } else if (!isNaN(coin) && coin > 0) {
          user.coin = (user.coin || 0) + coin;
          await user.save();
          console.log(
            `[Stripe Webhook] Đã cộng ${coin} coin cho user ${userId}`
          );
        }
      } catch (err) {
        console.error("[Stripe Webhook] Lỗi khi cộng coin:", err);
      }
    } else {
      console.error("[Stripe Webhook] Thiếu thông tin metadata cho giao dịch");
    }
  }

  res.json({ received: true });
};
