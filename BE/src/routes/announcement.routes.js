const express = require('express');

const mongoose = require('mongoose');

const Announcement = require('../models/Announcement');

const User = require('../models/User');

const optionalAuth = require('../middleware/optionalAuth');

const {

  PUBLIC_ANNOUNCEMENT_FILTER,

  formatPublicAnnouncement,

  filterAnnouncementsForViewer,

  buildPublisherUserMap

} = require('../utils/announcementFormat');

const { normalizeRole, resolveUserRole } = require('../utils/role');



const router = express.Router();

const loadPublisherUserMap = async (docs, { withAvatar = false } = {}) => {
  const emails = [
    ...new Set((docs || []).map((doc) => String(doc.publishedByEmail || '').trim()).filter(Boolean))
  ];
  if (!emails.length) return buildPublisherUserMap([]);
  const select = withAvatar ? 'email fullname role picture avatar' : 'email fullname role';
  const users = await User.find({ email: { $in: emails } }).select(select).lean();
  return buildPublisherUserMap(users);
};



const resolveViewerRole = async (req) => {

  if (!req.authEmail) return 'guest';

  try {

    const user = await User.findOne({ email: req.authEmail }).lean();

    if (!user) return 'guest';

    return normalizeRole(resolveUserRole(user));

  } catch {

    return 'guest';

  }

};



/** GET /api/announcements — thông báo công khai, lọc theo đối tượng nhận */

router.get('/', optionalAuth, async (req, res) => {

  try {

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);

    const viewerRole = await resolveViewerRole(req);

    const list = await Announcement.find(PUBLIC_ANNOUNCEMENT_FILTER)

      .select('-image')

      .sort({ publishedAt: -1, published_at: -1 })

      .limit(limit * 2)

      .populate('eventId', 'title source category')

      .lean();



    const filtered = filterAnnouncementsForViewer(list, viewerRole, req.authEmail).slice(0, limit);

    const userMap = await loadPublisherUserMap(filtered);

    return res.json({

      success: true,

      announcements: filtered.map((doc) => formatPublicAnnouncement(doc, userMap))

    });

  } catch (error) {

    console.error('public announcements list:', error);

    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });

  }

});



/** GET /api/announcements/:id/image */
router.get('/:id/image', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).send('Not found');
    }
    const {
      resolveAnnouncementImageResponse,
      writeAnnouncementImageFromDataUri,
    } = require('../utils/announcementImageStorage');
    const { isImageDataUri } = require('../utils/dataUriStorage');
    const doc = await Announcement.findById(req.params.id)
      .select('image imageFileExt')
      .lean();
    if (!doc) return res.status(404).send('No image');
    if (isImageDataUri(doc.image) && !doc.imageFileExt) {
      writeAnnouncementImageFromDataUri(String(doc._id), doc.image)
        .then((ext) =>
          Announcement.updateOne({ _id: doc._id }, { $set: { imageFileExt: ext, image: '' } })
        )
        .catch(() => {});
    }
    const resolved = await resolveAnnouncementImageResponse(doc);
    if (!resolved) return res.status(404).send('No image');
    res.set('Content-Type', resolved.mime);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(resolved.buffer);
  } catch (error) {
    console.error('announcement image:', error);
    return res.status(500).send('Server Error');
  }
});

/** GET /api/announcements/:id */

router.get('/:id', optionalAuth, async (req, res) => {

  try {

    if (!mongoose.isValidObjectId(req.params.id)) {

      return res.status(404).json({

        success: false,

        message: 'Thông báo không tồn tại hoặc đã được thu hồi.'

      });

    }

    const viewerRole = await resolveViewerRole(req);

    const doc = await Announcement.findOne({

      _id: req.params.id,

      ...PUBLIC_ANNOUNCEMENT_FILTER

    })

      .populate('eventId', 'title source category')

      .lean();



    if (!doc || !filterAnnouncementsForViewer([doc], viewerRole, req.authEmail).length) {

      return res.status(404).json({

        success: false,

        message: 'Thông báo không tồn tại hoặc đã được thu hồi.'

      });

    }



    const userMap = await loadPublisherUserMap([doc], { withAvatar: true });

    return res.json({
      success: true,
      announcement: formatPublicAnnouncement(doc, userMap, { withPublisherAvatar: true })
    });

  } catch (error) {

    console.error('public announcement detail:', error);

    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });

  }

});



module.exports = router;

