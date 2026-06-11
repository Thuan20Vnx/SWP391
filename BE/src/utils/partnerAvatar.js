const User = require('../models/User');

const resolvePartnerAvatarForAdmin = async (partner) => {
  const doc = partner.toObject ? partner.toObject() : { ...partner };
  const logo = String(doc.logo || '').trim();
  if (logo) {
    doc.avatar = logo;
    return doc;
  }
  const email = String(doc.email || '').trim().toLowerCase();
  if (!email) {
    doc.avatar = '';
    return doc;
  }
  const user = await User.findOne({ email }).select('picture avatar').lean();
  doc.avatar = user?.picture || user?.avatar || '';
  return doc;
};

module.exports = { resolvePartnerAvatarForAdmin };
