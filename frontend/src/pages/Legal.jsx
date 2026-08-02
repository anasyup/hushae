import Seo from '../components/Seo';

/**
 * Legal — a single component that renders Privacy / Terms / Returns / Shipping
 * based on the `kind` prop. Copy is HUSHAE-original, Pakistan-appropriate, and
 * covers the common e-commerce disclosures without pretending to be legal advice.
 */
export default function Legal({ kind = 'privacy' }) {
  const doc = DOCS[kind] || DOCS.privacy;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:py-24 md:px-8">
      <Seo title={doc.title} description={doc.subtitle} canonical={`/${kind}`} />
      <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">HUSHAE · Legal</p>
      <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">{doc.title}</h1>
      <p className="mt-4 text-sm text-ash">{doc.subtitle}</p>
      <p className="mt-1 text-xs text-ash">Last updated: 27 July 2026</p>
      <div className="prose prose-neutral mt-10 max-w-none text-[15px] leading-relaxed">
        {doc.sections.map((s, i) => (
          <section key={i} className="mb-10">
            <h2 className="mb-3 font-display text-2xl">{s.h}</h2>
            {/* A section may be list-only (Returns → "How to start a return"),
                in which case `p` is absent. Guarding here rather than adding an
                empty array to the data keeps the copy honest. This crashed the
                whole /returns route in production. */}
            {(s.p || []).map((para, j) => <p key={j} className="mb-3 text-ash">{para}</p>)}
            {s.list && (
              <ul className="mt-2 list-disc pl-6 text-ash">
                {s.list.map((li, k) => <li key={k} className="mb-1.5">{li}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

/* Contact details are admin-managed. The placeholder phone is intentionally
 * removed from customer-facing copy — we only publish email until the merchant
 * configures a real support number / WhatsApp. */
const CONTACT = {
  email: 'care@hushae.pk',
  wa: '', // populated from settings once a real WhatsApp number is configured
  address: 'HUSHAE · Pakistan',
};

const DOCS = {
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How we collect, use and safeguard your information.',
    sections: [
      {
        h: 'What we collect',
        p: [`When you shop with HUSHAE we collect only the information we need to fulfil your order and improve your experience — your name, email, shipping address, phone number, and details of the products you buy. If you create an account we also store your saved sizes, wishlist and past orders under your login.`],
      },
      {
        h: 'How we use it',
        p: [`We use your information to process orders, ship goods, respond to customer service enquiries, and — with your consent — to send you occasional updates about new arrivals or exclusive offers. Aggregate, non-identifying analytics help us understand what's working on the site.`],
      },
      {
        h: 'Cookies & tracking',
        p: [`Our cookie banner lets you accept or refuse Analytics and Marketing cookies. Essential cookies (login, cart, security) are always on because the store cannot function without them. Analytics use Google Analytics 4 with IP anonymisation; Marketing pixels (Meta, TikTok) only load if you accept them.`],
      },
      {
        h: 'How we protect it',
        p: [`Payment data (COD is our only method right now) is never stored on our servers. All account passwords are bcrypt-hashed. Our database sits in a secure managed cluster with encrypted connections. We never sell your data — promise.`],
      },
      {
        h: 'Your rights',
        p: [`You can request a copy or deletion of your data any time by emailing ${CONTACT.email}. Give us up to 14 working days to respond.`],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'The rules that keep our little store fair for everyone.',
    sections: [
      {
        h: 'Placing an order',
        p: [`When you place an order you confirm the delivery details are accurate and that you're at least 18 years old (or shopping with the consent of a guardian). Prices and product availability are updated in real time; if an item goes out of stock between browsing and checkout we'll notify you and refund any pre-paid amount.`],
      },
      {
        h: 'Payment',
        p: [`HUSHAE currently accepts Cash on Delivery (COD) only. Please have the exact amount ready when the courier arrives. Online payment methods will be announced once fully configured.`],
      },
      {
        h: 'Shipping & delivery',
        p: [`Orders are processed within 24\u201348 hours (Mon\u2013Sat) and delivered nationwide across Pakistan in 2\u20135 working days. Flat rate PKR 350; free shipping on orders over PKR 4,999. Every parcel is discreetly packaged with no product references visible on the outside.`],
      },
      {
        h: 'Cancellations',
        p: [`You may cancel any order before it is dispatched by emailing ${CONTACT.email}. Once a parcel has left our warehouse the order cannot be recalled, but wrong or defective items are always replaced \u2014 see Returns & Exchanges.`],
      },
      {
        h: 'Intellectual property',
        p: [`All content on this site — images, copy, product names, the HUSHAE mark — is our property. You may not reproduce it for commercial use without written permission.`],
      },
    ],
  },
  returns: {
    title: 'Returns & Exchanges',
    subtitle: 'Hygiene-first policy \u2014 honest and simple.',
    sections: [
      {
        h: 'Hygiene policy',
        p: [`For hygiene reasons, opened, worn or washed innerwear cannot be returned or exchanged. This includes all bras, panties, briefs, boxers, trunks, shapewear and undershirts where the hygiene seal has been removed or the garment has been worn.`],
      },
      {
        h: 'Wrong, damaged or defective items',
        p: [`If something arrives damaged, defective or is the wrong item, contact us at ${CONTACT.email} within 48 hours with your order number and a photo. We will arrange a free replacement and cover the return courier \u2014 no cost to you.`],
      },
      {
        h: 'Size exchanges',
        p: [`Size exchanges for unworn, unwashed pieces in original packaging are handled case by case. Reach out to ${CONTACT.email} with your order number and we will do our best to find a solution. A general exchange window is not currently promised.`],
      },
    ],
  },
  shipping: {
    title: 'Shipping Policy',
    subtitle: 'Fast, discreet, nationwide.',
    sections: [
      {
        h: 'Where we deliver',
        p: [`We ship anywhere in Pakistan — all four provinces plus GB, AJK, and remote areas. International shipping (UAE, UK, US) is coming soon.`],
      },
      {
        h: 'Delivery times',
        p: [`Most orders deliver in 2\u20135 working days across Pakistan. Same-day dispatch for orders placed before 3 PM, Mon\u2013Sat. Remote areas may take slightly longer; you will receive a tracking number as soon as your parcel leaves our warehouse.`],
      },
      {
        h: 'Cost',
        p: [`Flat rate PKR 350 per order. Free shipping on orders over PKR 4,999.`],
      },
      {
        h: 'Discreet packaging',
        p: [`Every HUSHAE order ships in a plain, unmarked outer parcel. The only person who knows what's inside is you.`],
      },
    ],
  },
};
