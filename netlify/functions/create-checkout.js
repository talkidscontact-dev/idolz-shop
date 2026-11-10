const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    // S'assurer que la requête est bien en POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Méthode non autorisée' };
    }

    try {
        const { items, shippingRate } = JSON.parse(event.body);

        // Transformation des articles pour forcer l'affichage du titre dynamique et éviter le NaN
        const line_items = items.map(item => {
            // Conversion sécurisée du prix en nombre pour éviter l'erreur "Invalid integer: NaN"
            const itemPrice = Number(item.price) || 0;
            const unitAmount = Math.round(itemPrice * 100);

            return {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: item.title || 'Produit IDOLZ', // Force le titre dynamique du produit
                    },
                    unit_amount: unitAmount, // Le prix exact en centimes
                },
                quantity: item.quantity || 1,
            };
        });

        // Création de la session de paiement Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: line_items,
            mode: 'payment',
            // Active la collecte obligatoire de l'adresse de livraison
            shipping_address_collection: {
                allowed_countries: ['FR', 'BE', 'CH', 'CA'], 
            },
            // Active la case pour les codes promo (comme IDOLZ10)
            allow_promotion_codes: true,
            // Applique le tarif de livraison envoyé par le site (0€ dès 50€ d'achat ou 4.90€)
            shipping_options: [
                { shipping_rate: shippingRate }
            ],
            // Redirections après paiement
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