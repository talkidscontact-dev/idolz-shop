const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    // S'assurer que la requête est bien en POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Méthode non autorisée' };
    }

    try {
        const { items, shippingRate } = JSON.parse(event.body);

        // Création de la session de paiement Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items,
            mode: 'payment',
            // Active la collecte obligatoire de l'adresse de livraison pour la France (et ajoute d'autres pays si besoin)
            shipping_address_collection: {
                allowed_countries: ['FR', 'BE', 'CH', 'CA'], 
            },
            // Active automatiquement la case "Code Promo" sur la page Stripe (pour IDOLZ10)
            allow_promotion_codes: true,
            // Applique le tarif de livraison envoyé par le site (4.90€ ou 0€)
            shipping_options: [
                { shipping_rate: shippingRate }
            ],
            // URL de redirection après le paiement
            success_url: `${event.headers.origin}/success.html`,
            cancel_url: `${event.headers.origin}/index.html`,
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: session.url }),
        };
    } catch (error) {
        console.error('Erreur Stripe Checkout:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};