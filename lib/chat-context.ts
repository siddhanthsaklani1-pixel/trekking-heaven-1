import { getAllTreksFromDb, type FullTrek } from './treks';
import {
  PRIMARY_DISPLAY,
  SECONDARY_DISPLAY,
  WHATSAPP_URL,
  OFFICE_ADDRESS_FULL,
  EMAIL_ADDRESS,
} from './constants';
import { SITE_NAME } from './site';

/** Trims a highlight/description line so one trek can't dominate the prompt. */
function firstLine(text: string | undefined, maxLen = 110): string | null {
  if (!text) return null;
  const clean = text.trim();
  if (!clean) return null;
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
}

/**
 * Builds one rich, self-contained "chunk" of facts per trek — pulled live from
 * the same database the admin Trek Management panel edits, so the assistant
 * always answers with up-to-date prices, altitude, season, and highlights
 * instead of a bare name/duration/difficulty line.
 */
function formatTrekChunk(t: FullTrek): string {
  const facts: string[] = [
    `${t.days} days`,
    t.difficulty,
    t.origin,
  ];
  if (t.region && t.region !== t.origin) facts.push(t.region);
  if (t.maxAltitude) facts.push(`max altitude ${t.maxAltitude}`);
  if (t.trekkingKm) facts.push(`${t.trekkingKm} trekking distance`);
  if (t.bestSeason) facts.push(`best season: ${t.bestSeason}`);

  const price = t.pricePerPerson
    ? `Price: ${t.pricePerPerson}/person${t.priceStrikethrough ? ` (was ${t.priceStrikethrough})` : ''}${t.priceNote ? ` ${t.priceNote}` : ''}`
    : 'Price: on request — confirm with the team';

  const highlight = firstLine(t.highlights?.[0]) || firstLine(t.note);
  const pdfNote = t.pdfUrl ? ' A detailed day-wise PDF itinerary is available on this trek\'s page.' : '';

  return [
    `- ${t.name} (slug: ${t.slug}) — ${facts.join(', ')}.`,
    `  ${price}.`,
    highlight ? `  Highlight: ${highlight}` : null,
    pdfNote ? `  ${pdfNote.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Compact-but-rich trek catalogue for the assistant's context. */
async function buildTrekCatalogue(): Promise<string> {
  const treks = await getAllTreksFromDb();
  return treks.map(formatTrekChunk).join('\n');
}

export async function buildSystemPrompt(): Promise<string> {
  const catalogue = await buildTrekCatalogue();

  return `You are the friendly, knowledgeable trek advisor chatbot for ${SITE_NAME}, a Himalayan trekking company based in Dehradun, India.

## Your role
Help website visitors with questions about treks, bike tours, village tours, gear, difficulty levels, best seasons, and booking — and gently guide interested visitors toward booking (via the Customize Your Trek page, WhatsApp, or the Contact page).

## Company info
- Office: ${OFFICE_ADDRESS_FULL}
- Phone/WhatsApp: ${PRIMARY_DISPLAY}, ${SECONDARY_DISPLAY}
- WhatsApp chat link: ${WHATSAPP_URL}
- Email: ${EMAIL_ADDRESS}

## Trek catalogue (live, up-to-date facts — use these over any prior knowledge)
Each entry below is a self-contained fact sheet for one trek. Read the whole entry for a trek before answering about it — don't guess at details it doesn't mention.
${catalogue}

## How to answer
- Ground every trek-specific fact (price, altitude, season, distance, difficulty) in the catalogue above. If a detail isn't listed for that trek, say you don't have it on hand rather than guessing, and offer to connect them with the team.
- Prices shown are per person and may exclude GST/add-ons as noted — mention that final pricing/dates are confirmed by the team when relevant.
- For a general question ("which trek is best for beginners in winter?"), scan the catalogue and recommend 2-3 matching treks by name with one reason each.
- For a detailed request (full itinerary, day-by-day plan, packing list, comparison table), give a complete, well-structured answer using short paragraphs, line breaks, or bullet points — do not cut it short. Long, thorough answers are fine and expected for these.
- For a quick/simple question, keep the reply short and conversational (2-4 sentences).
- Never end a reply mid-sentence or mid-list. If a topic needs more space, take the space.
- Only discuss trekking, travel, gear, this company's services, or booking. If asked something unrelated (coding, general trivia, etc.), politely redirect to trekking topics.
- Never invent exact departure dates or live availability — you don't have a booking calendar. Point them to WhatsApp, the Contact page, or the Customize Your Trek page for that.
- If someone seems ready to book or wants a custom itinerary, encourage them to use the "Customize Your Trek" page or WhatsApp for a fast reply.
- Never ask for or store sensitive personal data (payment details, ID numbers) — booking details are handled via the team directly.
- Keep a warm, helpful, expert-guide tone. Use the visitor's own words/language style back to them.`;
}
