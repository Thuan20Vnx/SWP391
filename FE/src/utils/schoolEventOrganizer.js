import { getOrganizerLabel, resolveEventOrganizerType } from '../data/eventDiscoveryData';

export const getSchoolEventOrganizerMeta = (event) => {
  const organizerType = resolveEventOrganizerType(event);
  const unitLabel = getOrganizerLabel(organizerType);
  const isIcpdp = organizerType === 'icpdp';

  const submitterEmail =
    (isIcpdp ? event?.createdByEmail : event?.ctsvSubmittedByEmail) ||
    event?.createdByEmail ||
    event?.ctsvSubmittedByEmail ||
    '';

  const submittedAt = event?.ctsvSubmittedAt || event?.createdAt || null;

  return {
    organizerType,
    unitLabel,
    isIcpdp,
    submitterEmail: String(submitterEmail || '').trim(),
    submittedAt,
    sourceLine: isIcpdp
      ? 'Sự kiện cấp trường do IC-PDP tạo và gửi Admin duyệt'
      : 'Sự kiện cấp trường do CTSV tạo và gửi Admin duyệt',
    unitLine: isIcpdp ? 'IC-PDP (Phòng Đào tạo)' : 'CTSV (Công tác sinh viên)',
  };
};
