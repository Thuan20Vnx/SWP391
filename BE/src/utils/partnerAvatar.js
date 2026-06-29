const User = require('../models/User');
const { sanitizePartnerForApi } = require('./partnerMediaStorage');
const { sanitizeUserAvatarForApi } = require('./userAvatarStorage');

const resolvePartnerAvatarForAdmin = async (partner) => {
  const doc = partner.toObject ? partner.toObject() : { ...partner };
  const media = sanitizePartnerForApi(doc);
  const logoUrl = media.logoUrl || media.logo || '';
  if (logoUrl) {
    return {
      ...doc,
      logo: logoUrl,
      logoUrl,
      avatar: logoUrl,
      hasLogo: media.hasLogo,
    };
  }
  const email = String(doc.email || '').trim().toLowerCase();
  if (!email) {
    return { ...doc, avatar: '', logo: '', logoUrl: '' };
  }
  const user = await User.findOne({ email }).select('picture avatar avatarFileExt _id').lean();
  const av = user ? sanitizeUserAvatarForApi(user) : { picture: '', avatar: '', avatarUrl: '' };
  const avatar = av.picture || av.avatar || av.avatarUrl || '';
  return { ...doc, avatar, logo: '', logoUrl: '' };
};

module.exports = { resolvePartnerAvatarForAdmin };
