import { EMPTY_EVENT_FORM, mapApiEventToForm } from '../../utils/eventFormState';

export const BANNER_MAX_BYTES = 5 * 1024 * 1024;
export const BANNER_ACCEPT = 'image/jpeg,image/png,image/webp';
export const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;

export const EMPTY_COMPANY = {
  companyName: '',
  partnerCode: '',
  representative: '',
  representativeTitle: '',
  phone: '',
  address: '',
  expectedSponsorAmount: ''
};

export { EMPTY_EVENT_FORM };

export const mapRequestToState = (req) => ({
  company: {
    companyName: req.companyName || '',
    partnerCode: req.partnerCode || '',
    representative: req.representative || '',
    representativeTitle: req.representativeTitle || '',
    phone: req.phone || '',
    address: req.address || '',
    expectedSponsorAmount: String(req.expectedSponsorAmount || '')
  },
  form: mapApiEventToForm(req, {
    location: req.location || '',
    maxSlots: req.totalTickets || req.expectedAttendees || 100
  }),
  benefits: req.benefits?.length ? req.benefits : [''],
  partnerMessage: req.partnerMessage || '',
  attachments: req.attachments || [],
  attachmentLinks: req.attachmentLinks || [],
  bannerFileName: req.bannerFileName || ''
});
