import { env } from "@/env";
import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  // id simple para correlacionar en Vercel logs
  const rid = `wh_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    const payload = await req.text();
    const signature = req.headers.get("stripe-signature");

    console.log(
      `[${rid}] webhook hit`,
      JSON.stringify({
        hasSignature: !!signature,
        contentLength: payload?.length ?? 0,
      }),
    );

    if (!signature) {
      console.error(`[${rid}] Missing stripe-signature header`);
      return NextResponse.json("Signature missing", { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );

    console.log(
      `[${rid}] event`,
      JSON.stringify({
        type: event.type,
        id: event.id,
        created: (event as any).created,
        livemode: (event as any).livemode,
      }),
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        console.log(
          `[${rid}] session.completed snapshot`,
          JSON.stringify({
            sessionId: s.id,
            customer: s.customer,
            subscription: s.subscription,
            metadata: s.metadata,
            mode: s.mode,
            payment_status: (s as any).payment_status,
          }),
        );
        await handleSessionCompleted(s, rid);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        // 👇 ESTE snapshot es el que necesitas para entender el Invalid Date
        console.log(
          `[${rid}] subscription snapshot`,
          JSON.stringify({
            subId: sub.id,
            status: sub.status,
            customer: sub.customer,
            current_period_end: (sub as any).current_period_end,
            current_period_end_type: typeof (sub as any).current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end,
            items_len: sub.items?.data?.length,
            price0: sub.items?.data?.[0]?.price?.id,
            metadata: sub.metadata,
          }),
        );

        await handleSubscriptionCreatedOrUpdated(sub, rid);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        console.log(
          `[${rid}] subscription.deleted snapshot`,
          JSON.stringify({
            subId: sub.id,
            status: sub.status,
            customer: sub.customer,
            metadata: sub.metadata,
          }),
        );
        await handleSubscriptionDeleted(sub, rid);
        break;
      }

      default:
        console.log(`[${rid}] Unhandled event type`, event.type);
    }

    console.log(`[${rid}] webhook done`);
    return NextResponse.json({ received: true });
  } catch (err: any) {
    // Stripe error + Prisma error van aquí
    console.error(`[${rid}] webhook error`, err?.message ?? err);
    return NextResponse.json("Webhook error", { status: 500 });
  }
}

async function handleSessionCompleted(
  session: Stripe.Checkout.Session,
  rid: string,
) {
  const userId = session.metadata?.userId;

  console.log(
    `[${rid}] handleSessionCompleted`,
    JSON.stringify({
      userId,
      customer: session.customer,
      subscription: session.subscription,
    }),
  );

  if (!userId) throw new Error("User ID is missing in session metadata");

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: { stripeCustomerId: session.customer as string },
  });

  console.log(`[${rid}] Clerk updated privateMetadata.stripeCustomerId`);
}

async function handleSubscriptionCreatedOrUpdated(
  subscription: Stripe.Subscription,
  rid: string,
) {
  const userId = (subscription.metadata as any)?.userId;

  console.log(
    `[${rid}] handleSubscriptionCreatedOrUpdated`,
    JSON.stringify({
      subId: subscription.id,
      status: subscription.status,
      userId,
    }),
  );

  if (!userId) {
    console.error(
      `[${rid}] subscription.metadata.userId missing -> skipping upsert`,
    );
    return;
  }

  const firstItem = subscription.items.data[0];
  if (!firstItem) {
    console.error(`[${rid}] subscription.items.data[0] missing -> skipping`);
    return;
  }

  // 🔥 Aquí aislamos el problema: current_period_end
  const raw = (subscription as any).current_period_end;
  const ms = Number(raw) * 1000;
  const date = new Date(ms);

  console.log(
    `[${rid}] period_end computed`,
    JSON.stringify({
      raw,
      rawType: typeof raw,
      ms,
      isFinite: Number.isFinite(ms),
      dateString: date.toString(),
      dateValid: !Number.isNaN(date.getTime()),
    }),
  );

  if (!["active", "trialing", "past_due"].includes(subscription.status)) {
    console.log(
      `[${rid}] status not billable -> deleting`,
      subscription.status,
    );
    await prisma.userSubscription.deleteMany({
      where: { stripeSubscriptionId: subscription.id },
    });
    return;
  }

  await prisma.userSubscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: firstItem.price.id,
      stripeCurrentPeriodEnd: date, // <- si esto es inválido, lo verás arriba
      stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripePriceId: firstItem.price.id,
      stripeCurrentPeriodEnd: date,
      stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`[${rid}] Prisma upsert OK`);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  rid: string,
) {
  console.log(
    `[${rid}] handleSubscriptionDeleted`,
    JSON.stringify({
      subId: subscription.id,
    }),
  );

  await prisma.userSubscription.deleteMany({
    where: { stripeSubscriptionId: subscription.id },
  });
}
