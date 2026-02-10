import { env } from "@/env";
import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

type WebhookMeta = {
  rid: string;
};

function makeRid(): string {
  return `wh_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

export async function POST(req: NextRequest) {
  const rid = makeRid();

  try {
    const payload = await req.text();
    const signature = req.headers.get("stripe-signature");

    console.log(
      `[${rid}] webhook hit`,
      JSON.stringify({ hasSignature: !!signature, payloadLen: payload.length }),
    );

    if (!signature) {
      console.error(`[${rid}] Missing stripe-signature header`);
      return NextResponse.json("Signature missing", { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    ) as Stripe.Event;

    console.log(
      `[${rid}] event`,
      JSON.stringify({
        id: event.id,
        type: event.type,
        created: event.created,
        livemode: event.livemode,
      }),
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log(
          `[${rid}] session.completed snapshot`,
          JSON.stringify({
            sessionId: session.id,
            mode: session.mode,
            customer: session.customer,
            subscription: session.subscription,
            metadata: session.metadata,
          }),
        );

        await handleSessionCompleted(session, { rid });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const firstPriceId = subscription.items.data[0]?.price?.id ?? null;

        console.log(
          `[${rid}] subscription snapshot`,
          JSON.stringify({
            subId: subscription.id,
            status: subscription.status,
            customer: subscription.customer,
            current_period_end: subscription.current_period_end,
            current_period_end_type: typeof subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            items_len: subscription.items.data.length,
            price0: firstPriceId,
            metadata: subscription.metadata,
          }),
        );

        await handleSubscriptionCreatedOrUpdated(subscription, { rid });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        console.log(
          `[${rid}] subscription.deleted snapshot`,
          JSON.stringify({
            subId: subscription.id,
            status: subscription.status,
            customer: subscription.customer,
            metadata: subscription.metadata,
          }),
        );

        await handleSubscriptionDeleted(subscription, { rid });
        break;
      }

      default:
        console.log(`[${rid}] Unhandled event type: ${event.type}`);
    }

    console.log(`[${rid}] webhook done`);
    return NextResponse.json({ received: true });
  } catch (err) {
    // ✅ no re-declares rid (así no pierdes trazabilidad)
    console.error(`[${rid}] webhook error`, err);
    return NextResponse.json("Webhook error", { status: 500 });
  }
}

async function handleSessionCompleted(
  session: Stripe.Checkout.Session,
  meta: WebhookMeta,
) {
  const userId = session.metadata?.userId;

  console.log(
    `[${meta.rid}] handleSessionCompleted`,
    JSON.stringify({
      userId: userId ?? null,
      customer: session.customer,
      subscription: session.subscription,
    }),
  );

  if (!userId) throw new Error("User ID is missing in session metadata");

  // 1) Guardar stripeCustomerId en Clerk
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: { stripeCustomerId: session.customer as string },
  });

  console.log(`[${meta.rid}] Clerk updated stripeCustomerId`);

  // 2) Guardar suscripción en Prisma usando retrieve() (datos completos)
  const subscriptionId = session.subscription as string | null;
  if (!subscriptionId) {
    console.log(`[${meta.rid}] session.completed without subscriptionId`);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const firstItem = subscription.items.data[0];
  if (!firstItem) throw new Error("Subscription item missing");

  const periodEnd = new Date(subscription.current_period_end * 1000);
  if (!isValidDate(periodEnd)) {
    throw new Error(
      `Invalid current_period_end from retrieve(). raw=${String(
        subscription.current_period_end,
      )} subId=${subscription.id}`,
    );
  }

  await prisma.userSubscription.upsert({
    where: { userId }, // 👈 recomendado (tu app lee por userId)
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: firstItem.price.id,
      stripeCurrentPeriodEnd: periodEnd,
      stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: firstItem.price.id,
      stripeCurrentPeriodEnd: periodEnd,
      stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`[${meta.rid}] ✅ Prisma upsert OK (from session.completed)`);
}

async function handleSubscriptionCreatedOrUpdated(
  subscription: Stripe.Subscription,
  meta: WebhookMeta,
) {
  const userId = subscription.metadata.userId;

  console.log(
    `[${meta.rid}] handleSubscriptionCreatedOrUpdated`,
    JSON.stringify({
      subId: subscription.id,
      status: subscription.status,
      userId: userId ?? null,
    }),
  );

  if (!userId) {
    console.error(
      `[${meta.rid}] subscription.metadata.userId missing -> skipping upsert`,
    );
    return;
  }

  const firstItem = subscription.items.data[0];
  if (!firstItem) {
    console.error(
      `[${meta.rid}] subscription.items.data[0] missing -> skipping`,
    );
    return;
  }

  // ✅ Evita el caso 'incomplete' (aquí current_period_end puede ser undefined)
  if (!["active", "trialing", "past_due"].includes(subscription.status)) {
    console.log(`[${meta.rid}] skip upsert, status:`, subscription.status);
    return;
  }

  const ms = subscription.current_period_end * 1000;
  const date = new Date(ms);

  console.log(
    `[${meta.rid}] period_end computed`,
    JSON.stringify({
      raw: subscription.current_period_end,
      rawType: typeof subscription.current_period_end,
      ms,
      isFinite: Number.isFinite(ms),
      dateString: date.toString(),
      dateValid: isValidDate(date),
    }),
  );

  if (!isValidDate(date)) {
    console.log(`[${meta.rid}] skip upsert, invalid period end`);
    return;
  }

  await prisma.userSubscription.upsert({
    where: { userId }, // 👈 recomendado
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: firstItem.price.id,
      stripeCurrentPeriodEnd: date,
      stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: firstItem.price.id,
      stripeCurrentPeriodEnd: date,
      stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`[${meta.rid}] Prisma upsert OK`);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  meta: WebhookMeta,
) {
  console.log(
    `[${meta.rid}] handleSubscriptionDeleted`,
    JSON.stringify({
      subId: subscription.id,
    }),
  );

  await prisma.userSubscription.deleteMany({
    where: { stripeSubscriptionId: subscription.id },
  });
}
