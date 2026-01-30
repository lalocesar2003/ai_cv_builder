componentes premiun estan en carpetas con el mismo nombre actions.ts y p

analisis action.ts utiliza stripe.checkout.sessions.create existe en funcion createCheckoutSession nose que hace pero es creada por mi stripe.checkout.sessions.create
nota:tengo que investigar para que se usa de clerk servvira mas adelante import { currentUser } from "@clerk/nextjs/server";
const stripeCustomerId = user.privateMetadata.stripeCustomerId as
| string
| undefined; se extrae el customer id
nota: esto es todo lo que almacena la constante session debo hacer una enciclopedia o una wiki de que hace cada campo del objeto
const session = await stripe.checkout.sessions.create({
line_items: [{ price: priceId, quantity: 1 }],
mode: "subscription",
success_url: `${env.NEXT_PUBLIC_BASE_URL}/billing/success`,
cancel_url: `${env.NEXT_PUBLIC_BASE_URL}/billing`,
customer: stripeCustomerId,
customer_email: stripeCustomerId
? undefined
: user.emailAddresses[0].emailAddress,
metadata: { userId: user.id },
subscription_data: { metadata: { userId: user.id } },
custom_text: {
terms_of_service_acceptance: {
message: `I have read AI Resume Builder's [terms of service](${env.NEXT_PUBLIC_BASE_URL}/tos) and agree to them.`,
},
},
consent_collection: { terms_of_service: "required" },
});

la funcion createCheckoutSession te da Failed to create checkout session si session en el objeto no hay url

nota hay hooks oara usar el modal usepremiun modal nose que es un hook aprender que es pero se ve simple

esto parece importante mas adelante
const premiumFeatures = ["AI tools", "Up to 3 resumes"];
const premiumPlusFeatures = ["Infinite resumes", "Design customizations"];

la funcion central es PremiumModal() nose que hace

creamos la funcion handlePremiumClick dentro de PremiumModal()
parece que su funcion es redirigirte a la url que e dio createcheckoutsession que ta createCheckoutSession(priceId); por priceId no se que es priceid hay que averiguarlo
