todo inicia bueno de una de las tantas formas en este paso con el CreateResumeButton.tsx si no estas subscripto a premiun plus te sale premiunmodal.ts esto lo detecta obteniendo el prop de cancreate que eso se define y condiciona nose donde xd a ya lo enecontre en page.tsx de la carpeta resumes que esta en main hay un prima que de acuerdo al user id te trae lo siguiente la cantidad de resumes que haz creado el nivel de subscripcion actual y asi es como verifica y puede ver si es true o false y asi obtener el prop de cancreate necesario para la activacion que renderiza el modal para seleccionar el tipo de subscripcion funciona cuando tu presionas algunas de las opciones createCheckoutSession crea una pagina en stripe para pagar lo selccionado esto gracias a stripe.checkout.sessions.create si quierers saber copmo funciona busca la documentacion en stripe

notaalgo importante del flujo son los price ide de stripe que ayudan a ubicar el objeto que tiene la informacion para crear la pagina de pago
nota este es el esquema prisma deberias entender que hace cada parte para mejor entendimiento
model UserSubscription {
id String @id @default(cuid())
userId String @unique
stripeCustomerId String @unique
stripeSubscriptionId String @unique
stripePriceId String
stripeCurrentPeriodEnd DateTime
stripeCancelAtPeriodEnd Boolean @default(false)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@map("user_subscriptions")
}

dato:en lib/subscription.ts esta la forma como oobtiene la informacion de tu tipo de subscripcion que epico con prisma.userSubscription.findUnique

tambie hay un subscripcionlevelprovider que segun lo que entiendo es para que el dato que es el nivel de subscion pueda ser visto por los componenetes de la pagina porque por alguna razon no lo puede ver directamente con subscripon. ts vamos a averiguar porque mas o menos lo entendi esto es lo que dice gpt "compartir el nivel de suscripción ya calculado con todos los componentes del cliente sin tener que pasarlo manualmente por props."

pero realmente se obtiente en page y layout el nivel con subscription.ts el level provider solo es para que tengas un componenete padre y eso por defecto le fdda a sus info la data que este obtiene y ya no tienes que traer mas props

dato importantisimo lo que pueden hacer las diferentes categorias se calcula en permissions.ts
