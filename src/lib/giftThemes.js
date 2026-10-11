// Looks for gift cards (lib/gifts.js on the server keeps the same keys).
export const GIFT_THEMES = {
  BIRTHDAY: { label: 'Birthday', emoji: '🎂', title: 'Happy birthday!', bg: 'linear-gradient(135deg, #ff7a59, #0D9488)' },
  THANKS: { label: 'Thank you', emoji: '🙏', title: 'Thank you!', bg: 'linear-gradient(135deg, #0ea5e9, #0D9488)' },
  LOVE: { label: 'Love', emoji: '❤️', title: 'Sent with love', bg: 'linear-gradient(135deg, #ec4899, #0D9488)' },
  CONGRATS: { label: 'Congrats', emoji: '🎉', title: 'Congratulations!', bg: 'linear-gradient(135deg, #f5b301, #0D9488)' },
  JUST_BECAUSE: { label: 'Just because', emoji: '🎁', title: 'A gift for you', bg: 'linear-gradient(135deg, #0D9488, #0B5F66)' },
};

export function giftShareText(gift, { fromName, value, kind }) {
  const t = GIFT_THEMES[gift.theme] || GIFT_THEMES.JUST_BECAUSE;
  const what = value ? `₦${Number(value).toLocaleString()} ${kind}` : kind;
  return `${t.emoji} ${fromName ? `${fromName} sent you` : 'I sent you'} ${what}!${gift.message ? `\n\n“${gift.message}”` : ''}\n\nOpen your gift: ${gift.link}`;
}
